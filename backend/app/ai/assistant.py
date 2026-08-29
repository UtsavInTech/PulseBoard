"""
PulseBoard assistant — OpenAI Responses API, server side only.

The API key never leaves this process: it is read from settings, passed to the
SDK, and never logged, returned, or echoed into a response body.
"""
import json
import logging
from typing import Callable, Optional

from ..config import get_settings
from .knowledge import load_knowledge

logger = logging.getLogger(__name__)
settings = get_settings()

_client = None

# Reasoning models accept (and are slowed by) a reasoning parameter; the
# gpt-4.x / gpt-4o families reject it outright.
REASONING_MODEL_PREFIXES = ("gpt-5", "o1", "o3", "o4")


def _request_kwargs(conversation, tools) -> dict:
    """Common Responses API arguments, with reasoning only where supported."""
    kwargs = {
        "model": settings.openai_model,
        "input": conversation,
        "tools": tools,
    }
    if settings.openai_model.startswith(REASONING_MODEL_PREFIXES):
        kwargs["reasoning"] = {"effort": settings.openai_reasoning_effort}
    return kwargs


class AssistantError(Exception):
    """Raised when the assistant cannot produce an answer."""


SYSTEM_PROMPT = """\
You are the PulseBoard assistant on PulseBoard's public website. You help
visitors understand the product and, when they are interested, help them
request a demo or a call.

GROUNDING — this is the most important rule:
Answer ONLY from the PulseBoard knowledge provided below. If the knowledge does
not cover something, say plainly that you do not have that information and
offer to pass the question to the team. Never invent features, metrics,
customers, pricing, integrations or capabilities. PulseBoard is an honest
prototype and overclaiming damages trust.

In particular, PulseBoard does NOT currently do fraud detection, AI/ML
prediction, billing, or calendar integration. If asked, say these are future
direction, not current capability.

STYLE:
- Concise and professional. Two short paragraphs at most unless asked for more.
- Plain text. No markdown headers, no bullet characters like * or #.
- Never claim to be human. You are PulseBoard's assistant.

DEMO REQUESTS:
If the visitor wants a demo, a call, or to speak to someone, collect their
name, email, phone, and preferred callback date/time. Company is optional.
Ask for whatever is still missing, a couple of fields at a time — do not
interrogate. Once you have name, email, phone and preferred time, call the
capture_demo_request tool. Do not claim a request was saved unless the tool
has actually returned success.

DRAFTING MESSAGES:
If asked for an email or LinkedIn message to contact PulseBoard, write a ready
to copy draft and present it as plain text. Make clear the visitor sends it
themselves — you never send anything on their behalf.
"""


def _get_client():
    """Lazily construct the OpenAI client so a missing key never breaks boot."""
    global _client
    if _client is None:
        if not settings.openai_api_key:
            raise AssistantError("The assistant is not configured on this server.")
        try:
            from openai import OpenAI
        except ImportError as exc:  # pragma: no cover - dependency guard
            raise AssistantError("The assistant dependency is not installed.") from exc
        _client = OpenAI(
            api_key=settings.openai_api_key,
            timeout=settings.openai_timeout_seconds,
        )
    return _client


def assistant_available() -> bool:
    """Whether the server is configured to answer. Never reveals the key."""
    return bool(settings.openai_api_key)


# ─── Tools the model may call ────────────────────────────────────────────────
DEMO_REQUEST_TOOL = {
    "type": "function",
    "name": "capture_demo_request",
    "description": (
        "Save a visitor's request for a PulseBoard demo or call. Only call this "
        "once name, email, phone and preferred_time have all been provided by "
        "the visitor. Never guess or fabricate any field."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "name": {"type": "string", "description": "Visitor's full name"},
            "email": {"type": "string", "description": "Visitor's email address"},
            "phone": {"type": "string", "description": "Visitor's phone number"},
            "preferred_time": {
                "type": "string",
                "description": "Preferred callback date and time, as the visitor stated it",
            },
            "company": {"type": "string", "description": "Company name, optional"},
            "notes": {"type": "string", "description": "Anything else worth passing on, optional"},
        },
        "required": ["name", "email", "phone", "preferred_time"],
        "additionalProperties": False,
    },
}


def _build_input(history: list[dict], message: str) -> list[dict]:
    """Turn the chat transcript into Responses API input items."""
    items = [{
        "role": "system",
        "content": f"{SYSTEM_PROMPT}\n\n=== PULSEBOARD KNOWLEDGE ===\n{load_knowledge()}",
    }]
    for turn in history:
        role = turn.get("role")
        content = (turn.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            items.append({"role": role, "content": content})
    items.append({"role": "user", "content": message})
    return items


def _extract_text(response) -> str:
    """Prefer the SDK's aggregate, fall back to walking the output items."""
    text = (getattr(response, "output_text", "") or "").strip()
    if text:
        return text
    parts = []
    for item in getattr(response, "output", []) or []:
        for block in getattr(item, "content", []) or []:
            if getattr(block, "type", "") == "output_text":
                parts.append(getattr(block, "text", ""))
    return "\n".join(p for p in parts if p).strip()


def _tool_calls(response) -> list:
    return [
        item for item in (getattr(response, "output", []) or [])
        if getattr(item, "type", "") == "function_call"
    ]


def ask_assistant(
    message: str,
    history: Optional[list[dict]] = None,
    on_demo_request: Optional[Callable[[dict], dict]] = None,
) -> dict:
    """
    Answer one visitor message.

    on_demo_request is invoked with validated arguments when the model decides
    a demo request is complete; it must persist the lead and return a dict
    describing the outcome.

    Returns {"reply": str, "demo_request_saved": bool}.
    """
    client = _get_client()
    tools = [DEMO_REQUEST_TOOL] if on_demo_request else []
    conversation = _build_input(history or [], message)

    try:
        response = client.responses.create(**_request_kwargs(conversation, tools))
    except Exception as exc:
        # Log the type only — the message can echo request details.
        logger.error("assistant: OpenAI request failed (%s)", type(exc).__name__)
        raise AssistantError("The assistant is temporarily unavailable.") from exc

    saved = False
    calls = _tool_calls(response)

    if calls and on_demo_request:
        # Reasoning models require a replayed function_call to be accompanied
        # by the reasoning item that produced it, so echo the whole output
        # array back rather than cherry-picking the call.
        conversation.extend(response.output)

        for call in calls:
            if getattr(call, "name", "") != "capture_demo_request":
                continue
            try:
                args = json.loads(getattr(call, "arguments", "") or "{}")
            except json.JSONDecodeError:
                args = {}
            outcome = on_demo_request(args)
            saved = saved or bool(outcome.get("saved"))
            conversation.append({
                "type": "function_call_output",
                "call_id": getattr(call, "call_id", ""),
                "output": json.dumps(outcome),
            })

        # Second pass so the model can confirm in its own words.
        try:
            response = client.responses.create(**_request_kwargs(conversation, tools))
        except Exception as exc:
            logger.error("assistant: follow-up failed (%s)", type(exc).__name__)
            if saved:
                return {
                    "reply": "Thanks — I've saved your request. The team will be in touch shortly.",
                    "demo_request_saved": True,
                }
            raise AssistantError("The assistant is temporarily unavailable.") from exc

    reply = _extract_text(response)
    if not reply:
        reply = "Sorry, I couldn't produce an answer to that. Could you rephrase?"

    return {"reply": reply, "demo_request_saved": saved}


def stream_assistant(
    message: str,
    history: Optional[list[dict]] = None,
    on_demo_request: Optional[Callable[[dict], dict]] = None,
):
    """
    Same contract as ask_assistant, yielded incrementally.

    Yields ("delta", text) as the answer is generated, then exactly one
    terminal event: ("done", {"demo_request_saved": bool}) or ("error", str).

    A tool call interrupts the text stream: the lead is persisted, then a
    second stream produces the model's confirmation.
    """
    client = _get_client()
    tools = [DEMO_REQUEST_TOOL] if on_demo_request else []
    conversation = _build_input(history or [], message)
    saved = False

    try:
        for _pass in range(2):  # at most one tool round-trip
            emitted_any = False
            with client.responses.stream(**_request_kwargs(conversation, tools)) as stream:
                for event in stream:
                    if getattr(event, "type", "") == "response.output_text.delta":
                        delta = getattr(event, "delta", "")
                        if delta:
                            emitted_any = True
                            yield ("delta", delta)
                final = stream.get_final_response()

            calls = _tool_calls(final)
            if not calls or not on_demo_request:
                if not emitted_any:
                    text = _extract_text(final)
                    yield ("delta", text or "Sorry, I couldn't produce an answer to that. Could you rephrase?")
                break

            # Reasoning models require the reasoning item alongside the call.
            conversation.extend(final.output)
            for call in calls:
                if getattr(call, "name", "") != "capture_demo_request":
                    continue
                try:
                    args = json.loads(getattr(call, "arguments", "") or "{}")
                except json.JSONDecodeError:
                    args = {}
                outcome = on_demo_request(args)
                saved = saved or bool(outcome.get("saved"))
                conversation.append({
                    "type": "function_call_output",
                    "call_id": getattr(call, "call_id", ""),
                    "output": json.dumps(outcome),
                })
        yield ("done", {"demo_request_saved": saved})
    except Exception as exc:
        logger.error("assistant: stream failed (%s)", type(exc).__name__)
        if saved:
            yield ("done", {"demo_request_saved": True})
        else:
            yield ("error", "The assistant is temporarily unavailable.")
