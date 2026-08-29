"""
Assistant endpoints.

Every OpenAI call happens here, server side. The API key is never returned to
a client, never logged, and never reachable from the browser.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

import json as _json

from fastapi.responses import StreamingResponse

from ..ai import (
    AssistantError, ask_assistant, assistant_available, knowledge_summary,
    stream_assistant, stream_dashboard_assistant, suggestions_for,
    run_analytics_tool,
)
from ..ai.analytics_tools import data_coverage
from datetime import datetime, timezone
from ..models import ROLES, ROLE_PRODUCT
from ..auth import get_current_user
from ..database import get_db
from ..models import DemoRequest, User
from ..schemas import (
    AssistantStatus, ChatRequest, ChatResponse,
    DemoRequestCreate, DemoRequestResponse,
    DashboardAssistantInfo, DashboardChatRequest,
)
from fastapi import Query
from typing import List

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["assistant"])


def _store_demo_request(db: Session, payload: DemoRequestCreate, source: str) -> DemoRequest:
    row = DemoRequest(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        preferred_time=payload.preferred_time,
        company=payload.company,
        notes=payload.notes,
        source=source,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    # Log that a lead arrived, never its contents.
    logger.info("demo_request stored id=%s source=%s", row.id, source)
    return row


@router.get("/status", response_model=AssistantStatus)
def status_endpoint():
    """Lets the UI hide the assistant when the server has no key configured."""
    return AssistantStatus(
        available=assistant_available(),
        documents=knowledge_summary()["documents"],
    )


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, request: Request, db: Session = Depends(get_db)):
    """Answer a visitor's question, grounded in the knowledge base."""
    if not assistant_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The assistant is not configured on this server.",
        )

    def on_demo_request(args: dict) -> dict:
        """Tool callback — validate before persisting anything."""
        try:
            validated = DemoRequestCreate(**args)
        except ValidationError as exc:
            missing = ", ".join(str(e["loc"][0]) for e in exc.errors())
            return {"saved": False, "error": f"Invalid or missing: {missing}. Ask the visitor again."}
        row = _store_demo_request(db, validated, source="assistant")
        return {"saved": True, "reference": f"PB-{row.id:05d}"}

    try:
        result = ask_assistant(
            message=payload.message,
            history=[t.model_dump() for t in payload.history],
            on_demo_request=on_demo_request,
        )
    except AssistantError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    return ChatResponse(**result)


@router.post("/chat/stream")
def chat_stream(payload: ChatRequest, db: Session = Depends(get_db)):
    """
    Server-sent events version of /ai/chat.

    Emits `data: {"type":"delta","text":...}` as the answer is produced, then a
    single `{"type":"done"}` or `{"type":"error"}`. The plain /ai/chat endpoint
    remains available as a fallback.
    """
    if not assistant_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The assistant is not configured on this server.",
        )

    history = [t.model_dump() for t in payload.history]
    message = payload.message

    def event_stream():
        # FastAPI runs yield-dependency cleanup after the streamed body is
        # finished, so the injected session is still open here — and unlike a
        # private SessionLocal() it honours dependency_overrides in tests.
        def on_demo_request(args: dict) -> dict:
            try:
                validated = DemoRequestCreate(**args)
            except ValidationError as exc:
                missing = ", ".join(str(e["loc"][0]) for e in exc.errors())
                return {"saved": False, "error": f"Invalid or missing: {missing}. Ask the visitor again."}
            row = _store_demo_request(db, validated, source="assistant")
            return {"saved": True, "reference": f"PB-{row.id:05d}"}

        try:
            for kind, value in stream_assistant(message, history, on_demo_request):
                if kind == "delta":
                    yield f"data: {_json.dumps({'type': 'delta', 'text': value})}\n\n"
                elif kind == "done":
                    yield f"data: {_json.dumps({'type': 'done', **value})}\n\n"
                else:
                    yield f"data: {_json.dumps({'type': 'error', 'detail': value})}\n\n"
        except AssistantError as exc:
            yield f"data: {_json.dumps({'type': 'error', 'detail': str(exc)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/demo-request", response_model=DemoRequestResponse, status_code=status.HTTP_201_CREATED)
def create_demo_request(payload: DemoRequestCreate, db: Session = Depends(get_db)):
    """Direct submission, for a plain form or when the assistant is offline."""
    return _store_demo_request(db, payload, source="form")


@router.get("/demo-requests", response_model=List[DemoRequestResponse])
def list_demo_requests(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Bookings captured by the assistant, newest first.

    Signed-in members only — these are real people's contact details, so the
    endpoint sits behind the same JWT auth as the analytics API.
    """
    return (
        db.query(DemoRequest)
        .order_by(DemoRequest.created_at.desc())
        .limit(limit)
        .all()
    )


# ═══════════════════════════════════════════════════════════════════════════
#  Authenticated dashboard analytics assistant
#
#  Distinct from the public /ai/chat assistant above: this one requires a JWT
#  and answers from the signed-in user's own organization data.
# ═══════════════════════════════════════════════════════════════════════════

def _active_window_label(filters: dict) -> str:
    """Describe the dashboard's current window for the system prompt."""
    from ..routers.analytics import effective_window

    start, end = effective_window(filters.get("start_date"), filters.get("end_date"))
    label = f"{start.date().isoformat()} to {end.date().isoformat()}"
    extras = [f"{k}={v}" for k, v in
              (("age", filters.get("age")), ("gender", filters.get("gender"))) if v]
    return f"{label} ({', '.join(extras)})" if extras else label


@router.get("/dashboard/info", response_model=DashboardAssistantInfo)
def dashboard_assistant_info(current_user: User = Depends(get_current_user)):
    """Role, company and starter questions for the panel."""
    role = current_user.role or ROLE_PRODUCT
    org = current_user.organization
    return DashboardAssistantInfo(
        available=assistant_available() and current_user.organization_id is not None,
        role=role,
        role_label=ROLES.get(role, "Member"),
        organization=org.name if org else None,
        product=org.product_name if org else None,
        suggestions=suggestions_for(role),
    )


@router.post("/dashboard/chat/stream")
def dashboard_chat_stream(
    payload: DashboardChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Answer an analytics question about the signed-in user's organization.

    Organization scope is taken from the authenticated user and bound into the
    tool runner below — the request body has no organization field, so neither
    the client nor the model can reach another company's data.
    """
    if not assistant_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The analytics assistant is not configured on this server.",
        )
    if current_user.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This account is not attached to an organization yet.",
        )

    role = current_user.role or ROLE_PRODUCT
    message = payload.message
    history = [t.model_dump() for t in payload.history]
    org = current_user.organization

    # Trusted application state: the filters this authenticated user actually
    # has applied. The model never sees or sets these — it can only name a
    # period, which the server resolves against this window.
    dashboard_filters = payload.context.model_dump() if payload.context else {}

    context = {
        "today": datetime.now(timezone.utc).strftime("%Y-%m-%d (%A)"),
        "coverage": data_coverage(db, current_user.organization_id),
        "active_window": _active_window_label(dashboard_filters),
        "organization": org.name if org else None,
        "product": org.product_name if org else None,
    }

    def run_tool(name: str, args: dict) -> dict:
        # Bound to this user. The model supplies a tool name and at most a
        # named period; organization, dates and demographics come from here.
        return run_analytics_tool(name, args, db, current_user, dashboard_filters)

    def event_stream():
        try:
            for kind, value in stream_dashboard_assistant(
                message=message, role=role, run_tool=run_tool,
                history=history, context=context,
            ):
                if kind == "delta":
                    yield f"data: {_json.dumps({'type': 'delta', 'text': value})}\n\n"
                elif kind == "done":
                    yield f"data: {_json.dumps({'type': 'done', **value})}\n\n"
                else:
                    yield f"data: {_json.dumps({'type': 'error', 'detail': value})}\n\n"
        except AssistantError as exc:
            yield f"data: {_json.dumps({'type': 'error', 'detail': str(exc)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
