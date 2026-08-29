"""
The analytics tools the dashboard assistant may call.

Two rules govern everything here:

  1. Every query is scoped to the ORGANIZATION OF THE AUTHENTICATED USER.
     org_id comes from the JWT-resolved User object and is never accepted from
     the model or the client. A model cannot ask for another company's data
     because there is no parameter through which to ask.

  2. Calculations are not reimplemented. get_analytics_summary delegates to
     compute_analytics — the same engine behind the dashboard — so the
     assistant and the charts can never disagree.
"""
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import distinct, func
from sqlalchemy.orm import Session

from ..models import EndUser, Event, User, ROLE_PRODUCT

# NOTE: app.routers.analytics is imported lazily inside the functions below.
# Importing it at module scope creates a cycle — app.ai -> analytics_tools ->
# app.routers.analytics -> app.routers.__init__ -> app.routers.ai -> app.ai —
# which fails or half-initialises depending on which module Python loads first.

logger = logging.getLogger(__name__)

MAX_WINDOW_DAYS = 180
DEFAULT_WINDOW_DAYS = 30

def _engine():
    """Lazily resolve the analytics engine, avoiding the import cycle."""
    from ..routers.analytics import compute_analytics, _apply_age_filter, _pct
    return compute_analytics, _apply_age_filter, _pct


BREAKDOWN_COLUMNS = {
    "category": Event.category,
    "device": Event.device,
    "browser": Event.browser,
    "acquisition_source": EndUser.acquisition_source,
}


# ═══════════════════════════════════════════════════════════════════════════
#  Tool definitions handed to the model
# ═══════════════════════════════════════════════════════════════════════════
# The model never supplies dates. It names a period; the server resolves it
# against the dashboard's active window. This guarantees the assistant and the
# charts describe the same span, and removes a whole class of failure where a
# hallucinated date range silently returned an empty or unrelated slice.
PERIODS = (
    "dashboard",
    "previous_period",
    "this_week",
    "last_week",
    "this_month",
    "last_month",
)

PERIOD_PROP = {
    "period": {
        "type": "string",
        "enum": list(PERIODS),
        "description": (
            "Which window to read. 'dashboard' (the default) is exactly the range "
            "the user currently has selected — use it unless the question names a "
            "different period. 'previous_period' is the equal-length span "
            "immediately before the dashboard window, for comparisons. Actual "
            "dates are computed server-side."
        ),
    },
}
DATE_PROPS = PERIOD_PROP

ANALYTICS_TOOLS = [
    {
        "type": "function",
        "name": "get_analytics_summary",
        "description": (
            "The headline analytics for the signed-in user's organization: KPIs, the "
            "conversion funnel with drop-off at each stage, a segment breakdown, and "
            "computed insights. This is the same calculation that powers the dashboard. "
            "Start here for most questions. OMIT start_date and end_date to match the "
            "window the user currently sees on their dashboard."
        ),
        # Deliberately no age/gender parameters. Demographic filters come from
        # the user's dashboard state and are applied server-side: the model
        # repeatedly invented plausible-looking filters, silently narrowing the
        # dataset to a handful of users and answering confidently from it.
        "parameters": {
            "type": "object",
            "properties": {**DATE_PROPS},
            "additionalProperties": False,
        },
    },
    {
        "type": "function",
        "name": "get_daily_activity",
        "description": (
            "Daily counts with the weekday name for each date. Use this for trends, "
            "period-over-period comparisons, and any weekend-versus-weekday question — "
            "compute those from the returned rows rather than guessing."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                **DATE_PROPS,
                "event_name": {
                    "type": "string",
                    "description": "Restrict to one event (e.g. product_viewed, purchase_completed). Omit for all events.",
                },
            },
            "additionalProperties": False,
        },
    },
    {
        "type": "function",
        "name": "get_breakdown",
        "description": (
            "Volume and conversion per segment. Answers which category, device, browser "
            "or acquisition channel performs best or worst."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "dimension": {
                    "type": "string",
                    "enum": ["category", "device", "browser", "acquisition_source"],
                },
                **DATE_PROPS,
            },
            "required": ["dimension"],
            "additionalProperties": False,
        },
    },
    {
        "type": "function",
        "name": "get_common_paths",
        "description": (
            "The most frequent step-to-step transitions users make within a session, "
            "plus session depth and repeated-action counts. Use for journey, friction "
            "and behaviour questions."
        ),
        "parameters": {
            "type": "object",
            "properties": {**DATE_PROPS},
            "additionalProperties": False,
        },
    },
]


# ═══════════════════════════════════════════════════════════════════════════
#  Implementations
# ═══════════════════════════════════════════════════════════════════════════
def resolve_period(period: str, dashboard: Optional[dict]) -> tuple[datetime, datetime, str]:
    """
    Turn a named period into concrete dates, anchored on the dashboard window.

    dashboard is trusted application state supplied by the authenticated
    frontend — the filters the user actually has applied. Everything else is
    derived from it, never from the model.
    """
    from ..routers.analytics import effective_window

    dashboard = dashboard or {}
    dash_start, dash_end = effective_window(
        dashboard.get("start_date"), dashboard.get("end_date")
    )
    span = dash_end - dash_start
    now = datetime.now(timezone.utc)

    if period == "previous_period":
        return dash_start - span, dash_start, "the period immediately before the dashboard window"

    if period in ("this_week", "last_week"):
        # Weeks run Monday to Sunday.
        monday = (now - timedelta(days=now.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        if period == "this_week":
            return monday, now, "this week (Monday to now)"
        return monday - timedelta(days=7), monday, "last week (Monday to Sunday)"

    if period in ("this_month", "last_month"):
        first = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if period == "this_month":
            return first, now, "this month so far"
        prev_end = first
        prev_start = (first - timedelta(days=1)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return prev_start, prev_end, "last calendar month"

    # "dashboard" and anything unrecognised
    return dash_start, dash_end, "the dashboard's selected range"


def _window(args: dict, dashboard: Optional[dict] = None) -> tuple[datetime, datetime]:
    start, end, _label = resolve_period(args.get("period") or "dashboard", dashboard)
    if (end - start).days > MAX_WINDOW_DAYS:
        start = end - timedelta(days=MAX_WINDOW_DAYS)
    return start, end


def _demographics(dashboard: Optional[dict]) -> tuple[str, str]:
    """Demographic filters, taken only from the user's dashboard state."""
    dashboard = dashboard or {}
    age = dashboard.get("age") if dashboard.get("age") in AGE_BRACKETS else ""
    gender = dashboard.get("gender") if dashboard.get("gender") in GENDERS else ""
    return age or "", gender or ""


def _base_query(db: Session, org_id: Optional[int], start, end, age="", gender=""):
    q = (
        db.query(Event)
        .join(EndUser, Event.end_user_id == EndUser.id)
        .filter(
            Event.organization_id == org_id,   # ← the only org scope, from the JWT
            Event.timestamp >= start,
            Event.timestamp <= end,
        )
    )
    _, apply_age_filter, _ = _engine()
    q = apply_age_filter(q, age)
    if gender:
        q = q.filter(EndUser.gender == gender)
    return q


def _tool_analytics_summary(db, user, args, dashboard=None) -> dict:
    start, end = _window(args, dashboard)
    age, gender = _demographics(dashboard)
    compute_analytics, _, _ = _engine()
    result = compute_analytics(
        db,
        org_id=user.organization_id,
        role=user.role or ROLE_PRODUCT,
        start=start, end=end,
        age_group=age,
        gender_val=gender,
    )
    return {
        "window": {"start": start.date().isoformat(), "end": end.date().isoformat()},
        "total_events": result.total_events,
        "kpis": [k.model_dump() for k in result.kpis],
        "funnel": [f.model_dump() for f in result.funnel],
        "funnel_title": result.funnel_title,
        "breakdown_title": result.comparisons_title,
        "breakdown": [c.model_dump() for c in result.comparisons],
        "top_events": [b.model_dump() for b in result.bar_chart[:10]],
        "computed_insights": [i.model_dump() for i in result.insights],
    }


def _tool_daily_activity(db, user, args, dashboard=None) -> dict:
    start, end = _window(args, dashboard)
    q = _base_query(db, user.organization_id, start, end, *_demographics(dashboard))

    # An event name the dataset does not contain would silently return zeros,
    # which reads as "no activity" rather than "wrong filter". The model once
    # passed the literal string "all" and concluded there was no traffic.
    known = {
        r[0] for r in db.query(Event.event_name)
        .filter(Event.organization_id == user.organization_id)
        .distinct().all()
    }
    requested = (args.get("event_name") or "").strip()
    SENTINELS = {"", "all", "any", "all events", "*", "none"}
    unknown_event = None
    if requested and requested.lower() not in SENTINELS:
        if requested in known:
            q = q.filter(Event.event_name == requested)
        else:
            unknown_event = requested

    rows = (
        q.with_entities(
            func.date_trunc("day", Event.timestamp).label("day"),
            func.count(Event.id),
            func.count(distinct(Event.end_user_id)),
            func.count(distinct(Event.session_id)),
        )
        .group_by(func.date_trunc("day", Event.timestamp))
        .order_by(func.date_trunc("day", Event.timestamp))
        .all()
    )
    days = []
    for day, events, users, sessions in rows:
        d = day if hasattr(day, "strftime") else datetime.fromisoformat(str(day))
        days.append({
            "date": d.strftime("%Y-%m-%d"),
            "weekday": d.strftime("%A"),
            "is_weekend": d.weekday() >= 5,
            "events": events,
            "users": users,
            "sessions": sessions,
        })
    # Window-level distinct counts. Daily distinct users cannot be summed —
    # anyone active on two days would be counted twice — so provide the correct
    # totals rather than leaving the model to add the daily rows up.
    totals = q.with_entities(
        func.count(Event.id),
        func.count(distinct(Event.end_user_id)),
        func.count(distinct(Event.session_id)),
    ).first()

    # Weekend/weekday computed server-side. Distinct users cannot be derived by
    # summing the daily rows, so each half is counted independently in SQL.
    # PostgreSQL DOW: 0 = Sunday, 6 = Saturday.
    dow = func.extract("dow", Event.timestamp)
    split = (
        q.with_entities(
            dow.in_([0, 6]).label("weekend"),
            func.count(Event.id),
            func.count(distinct(Event.end_user_id)),
            func.count(distinct(Event.session_id)),
        )
        .group_by(dow.in_([0, 6]))
        .all()
    )
    weekend_split = {
        "weekend": {"events": 0, "distinct_users": 0, "distinct_sessions": 0},
        "weekday": {"events": 0, "distinct_users": 0, "distinct_sessions": 0},
    }
    for is_weekend, events_n, users_n, sessions_n in split:
        key = "weekend" if is_weekend else "weekday"
        weekend_split[key] = {
            "events": events_n or 0,
            "distinct_users": users_n or 0,
            "distinct_sessions": sessions_n or 0,
        }

    result_event = "all events"
    if requested and requested.lower() not in SENTINELS and not unknown_event:
        result_event = requested

    out = {
        "window": {"start": start.date().isoformat(), "end": end.date().isoformat()},
        "event_name": result_event,
        "days": days,
        "window_totals": {
            "events": totals[0] or 0,
            "distinct_users": totals[1] or 0,
            "distinct_sessions": totals[2] or 0,
        },
        "weekend_vs_weekday": weekend_split,
        "note": (
            "Weekend means Saturday or Sunday, already computed in weekend_vs_weekday — "
            "use those figures directly rather than deriving them. "
            "Event counts CAN be summed across days. "
            "The per-day 'users' and 'sessions' figures are distinct counts within that "
            "day and MUST NOT be summed across days — a user active on two days would be "
            "counted twice. For a user or session total over the whole window, use "
            "window_totals, or call this tool again with that exact window."
        ),
    }
    if unknown_event:
        out["ignored_event_name"] = (
            f"'{unknown_event}' is not an event in this dataset, so it was ignored and "
            f"these figures cover all events. Valid names: {', '.join(sorted(known))}."
        )
    return out


def _tool_breakdown(db, user, args, dashboard=None) -> dict:
    dimension = args.get("dimension")
    column = BREAKDOWN_COLUMNS.get(dimension)
    if column is None:
        return {"error": f"Unknown dimension. Choose one of {sorted(BREAKDOWN_COLUMNS)}."}

    start, end = _window(args, dashboard)
    base = _base_query(db, user.organization_id, start, end, *_demographics(dashboard))

    reached = dict(
        base.filter(Event.event_name == "product_viewed", column.isnot(None))
        .with_entities(column, func.count(distinct(Event.end_user_id)))
        .group_by(column).all()
    )
    converted = dict(
        base.filter(Event.event_name == "purchase_completed", column.isnot(None))
        .with_entities(column, func.count(distinct(Event.end_user_id)))
        .group_by(column).all()
    )
    _, _, pct = _engine()
    rows = [
        {
            "segment": label,
            "users_reached": total,
            "users_converted": converted.get(label, 0),
            "conversion_pct": pct(converted.get(label, 0), total),
        }
        for label, total in sorted(reached.items(), key=lambda kv: kv[1], reverse=True)
    ]
    average = round(sum(r["conversion_pct"] for r in rows) / len(rows), 1) if rows else 0.0
    return {
        "dimension": dimension,
        "window": {"start": start.date().isoformat(), "end": end.date().isoformat()},
        "rows": rows,
        "average_conversion_pct": average,
        "note": "users_reached counts distinct users with a product_viewed event in that segment.",
    }


def _tool_common_paths(db, user, args, dashboard=None) -> dict:
    from sqlalchemy import text

    start, end = _window(args, dashboard)
    base = _base_query(db, user.organization_id, start, end, *_demographics(dashboard))

    paths = db.execute(text("""
        SELECT a.event_name || ' -> ' || b.event_name AS path, COUNT(*) AS n
        FROM events a
        JOIN events b
          ON a.session_id = b.session_id
         AND b.timestamp > a.timestamp
         AND a.organization_id = b.organization_id
        WHERE a.organization_id = :org
          AND a.timestamp BETWEEN :start AND :end
          AND NOT EXISTS (
                SELECT 1 FROM events m
                 WHERE m.session_id = a.session_id
                   AND m.timestamp > a.timestamp
                   AND m.timestamp < b.timestamp
          )
        GROUP BY path ORDER BY n DESC LIMIT 10
    """), {"org": user.organization_id, "start": start, "end": end}).fetchall()

    sessions = base.with_entities(func.count(distinct(Event.session_id))).scalar() or 0
    events = base.with_entities(func.count(Event.id)).scalar() or 0
    repeated = (
        base.with_entities(Event.end_user_id, Event.event_name)
        .group_by(Event.end_user_id, Event.event_name)
        .having(func.count(Event.id) >= 3).count()
    )
    abandons = dict(
        base.filter(Event.event_name.in_(
            ("cart_abandoned", "checkout_abandoned", "payment_failed", "order_cancelled")
        ))
        .with_entities(Event.event_name, func.count(Event.id))
        .group_by(Event.event_name).all()
    )
    return {
        "window": {"start": start.date().isoformat(), "end": end.date().isoformat()},
        "sessions": sessions,
        "events_per_session": round(events / sessions, 1) if sessions else 0.0,
        "repeated_action_instances": repeated,
        "abandonment_events": abandons,
        "common_transitions": [{"path": r[0], "occurrences": r[1]} for r in paths],
    }


_DISPATCH = {
    "get_analytics_summary": _tool_analytics_summary,
    "get_daily_activity": _tool_daily_activity,
    "get_breakdown": _tool_breakdown,
    "get_common_paths": _tool_common_paths,
}


# ═══════════════════════════════════════════════════════════════════════════
#  Argument sanitising
#
#  Tool arguments are MODEL OUTPUT and are never trusted. A model can emit
#  malformed values (a degenerate repetition loop once produced an end_date of
#  "2026-08-29\' ...JsonJsonJson...") or invent filters the user never asked
#  for, silently narrowing the dataset and producing confidently wrong answers.
#  Anything that is not recognised is dropped rather than passed through.
# ═══════════════════════════════════════════════════════════════════════════
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_EVENT_RE = re.compile(r"^[a-z][a-z_]{0,60}$")
AGE_BRACKETS = {"<18", "18-40", ">40"}
GENDERS = {"Male", "Female", "Other"}


def _sanitize(name: str, args: dict) -> tuple[dict, list[str]]:
    """
    Return (clean args, names of dropped arguments).

    Dates and demographics are NOT accepted from the model under any
    circumstance — they come from authenticated dashboard state. Anything the
    model sends for them is recorded as dropped and discarded.
    """
    clean, dropped = {}, []

    period = args.get("period")
    if period is not None:
        if period in PERIODS:
            clean["period"] = period
        else:
            dropped.append("period")

    # Explicitly rejected: the model does not get to choose these.
    for key in ("start_date", "end_date", "age", "gender", "organization_id", "org_id"):
        if args.get(key) is not None:
            dropped.append(key)

    if "event_name" in args and args["event_name"] is not None:
        value = str(args["event_name"]).strip()
        if _EVENT_RE.match(value):
            clean["event_name"] = value
        else:
            dropped.append("event_name")

    if "dimension" in args and args["dimension"] is not None:
        if args["dimension"] in BREAKDOWN_COLUMNS:
            clean["dimension"] = args["dimension"]
        else:
            dropped.append("dimension")

    return clean, dropped


def data_coverage(db: Session, org_id: Optional[int]) -> dict:
    """
    The real span of this organization's events.

    Without this the model has no idea what "this week" means and will invent a
    date window, query an empty range, and report no data.
    """
    if org_id is None:
        return {}
    row = (
        db.query(func.min(Event.timestamp), func.max(Event.timestamp), func.count(Event.id))
        .filter(Event.organization_id == org_id)
        .first()
    )
    if not row or not row[0]:
        return {}
    return {
        "earliest_event": row[0].strftime("%Y-%m-%d"),
        "latest_event": row[1].strftime("%Y-%m-%d"),
        "total_events": row[2],
    }


def run_analytics_tool(
    name: str,
    args: dict,
    db: Session,
    user: User,
    dashboard_filters: Optional[dict] = None,
) -> dict:
    """
    Execute one tool call for the authenticated user.

    org scoping comes from the JWT-resolved user, and demographic filters come
    from dashboard_filters (the user's own dashboard state) — never from the
    model. Nothing the model emits can widen or silently narrow access.
    """
    handler = _DISPATCH.get(name)
    if handler is None:
        return {"error": f"Unknown tool '{name}'."}
    if user.organization_id is None:
        return {"error": "This account is not attached to an organization, so there is no data to read."}
    clean, dropped = _sanitize(name, args or {})
    if dropped:
        logger.warning("ai_tool name=%s dropped malformed args=%s", name, dropped)
    try:
        # Log the call shape and its sanitised parameters (dates/filters only,
        # never the rows returned) so window issues stay diagnosable.
        logger.info("ai_tool name=%s org=%s args=%s", name, user.organization_id, clean)
        result = handler(db, user, clean, dashboard_filters)
        start, end = _window(clean, dashboard_filters)
        _, _, label = resolve_period(clean.get("period") or "dashboard", dashboard_filters)
        result["window_used"] = {
            "period": clean.get("period") or "dashboard",
            "description": label,
            "start": start.date().isoformat(),
            "end": end.date().isoformat(),
        }
        if dropped:
            result["ignored_arguments"] = (
                f"Ignored: {', '.join(sorted(set(dropped)))}. Date ranges and demographic "
                f"filters are set by the user's dashboard, not by you. Use the 'period' "
                f"argument to request a different window."
            )
        return result
    except Exception as exc:
        logger.error("ai_tool failed name=%s (%s)", name, type(exc).__name__)
        return {"error": "That query could not be completed."}
