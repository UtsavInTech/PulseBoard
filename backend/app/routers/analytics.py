import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, text, distinct
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import get_settings
from ..database import get_db
from ..models import (
    EndUser, Event, User,
    ROLE_PRODUCT, ROLE_GROWTH, ROLE_RESEARCH, ROLE_EXECUTIVE, ROLES,
)
from ..schemas import (
    AnalyticsResponse, BarChartItem, LineChartItem,
    KpiItem, FunnelStep, SegmentItem, SequenceItem,
    ComparisonRow, InsightItem,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["analytics"])
settings = get_settings()

# ─── Optional Redis cache — degrades gracefully if Redis absent ───────────────
_redis_client = None
CACHE_ENABLED = False
CACHE_TTL = 60  # seconds
DEFAULT_WINDOW_DAYS = 30

# ─── The product funnel the demo dataset is built around ─────────────────────
PRODUCT_FUNNEL = [
    ("homepage_viewed", "Visited"),
    ("product_viewed", "Viewed product"),
    ("add_to_cart", "Added to cart"),
    ("checkout_started", "Started checkout"),
    ("purchase_completed", "Purchased"),
]
GROWTH_FUNNEL = [
    ("signup", "Signed up"),
    ("onboarding_complete", "Activated"),
    ("product_viewed", "Engaged"),
    ("purchase_completed", "Converted"),
]
ACTIVATION_EVENT = "onboarding_complete"
CONVERSION_EVENT = "purchase_completed"

# Discretionary product features, as distinct from lifecycle events and
# commercial funnel steps. "Least used feature" is only meaningful across these.
FEATURE_EVENTS = {"search", "review_viewed", "wishlist_added", "category_viewed"}

# Events that signal a user gave up.
ABANDON_EVENTS = ("cart_abandoned", "checkout_abandoned", "payment_failed", "order_cancelled")


def _get_redis():
    global _redis_client, CACHE_ENABLED
    if _redis_client is None:
        try:
            import redis as redis_lib
            _redis_client = redis_lib.from_url(settings.redis_url, decode_responses=True)
            _redis_client.ping()
            CACHE_ENABLED = True
            logger.info("Redis cache connected")
        except Exception as exc:
            logger.warning(f"Redis unavailable, caching disabled: {exc}")
            CACHE_ENABLED = False
    return _redis_client


def _apply_age_filter(query, age_group: Optional[str]):
    """Apply an end-user age-bracket WHERE clause."""
    if age_group == "<18":
        return query.filter(EndUser.age < 18)
    elif age_group == "18-40":
        return query.filter(EndUser.age >= 18, EndUser.age <= 40)
    elif age_group == ">40":
        return query.filter(EndUser.age > 40)
    return query


def _pct(part: int, whole: int) -> float:
    return round(part / whole * 100, 1) if whole else 0.0


def _build_funnel(base, steps) -> list[FunnelStep]:
    """
    Users who completed each step AND every step before it.

    Counting steps independently lets a later step exceed an earlier one — a
    user who signed up before the window but browsed inside it would inflate
    "Engaged" past 100%. Intersecting progressively keeps the funnel monotonic,
    which is what a funnel actually means.
    """
    counts, running = [], None
    for event_name, _label in steps:
        reached = {
            r[0] for r in base.filter(Event.event_name == event_name)
            .with_entities(Event.end_user_id).distinct().all()
        }
        running = reached if running is None else (running & reached)
        counts.append(len(running))

    first = counts[0] if counts else 0
    out = []
    for i, (_event_name, label) in enumerate(steps):
        prev = counts[i - 1] if i else counts[i]
        out.append(FunnelStep(
            step=label,
            users=counts[i],
            conversion=_pct(counts[i], first),
            drop_off=_pct(prev - counts[i], prev) if i and prev else 0.0,
        ))
    return out


def _users_with(base, event_name) -> int:
    return base.filter(Event.event_name == event_name).with_entities(
        func.count(distinct(Event.end_user_id))
    ).scalar() or 0


def _breakdown(base, column, top_event, convert_event, limit=8) -> list[ComparisonRow]:
    """
    Two-stage counts per dimension: how many users reached `top_event`, and how
    many of those went on to `convert_event`. This is what exposes "high views,
    low conversion" segments.
    """
    tops = dict(
        base.filter(Event.event_name == top_event, column.isnot(None))
        .with_entities(column, func.count(distinct(Event.end_user_id)))
        .group_by(column).all()
    )
    convs = dict(
        base.filter(Event.event_name == convert_event, column.isnot(None))
        .with_entities(column, func.count(distinct(Event.end_user_id)))
        .group_by(column).all()
    )
    if not tops:
        return []

    rates = {k: _pct(convs.get(k, 0), v) for k, v in tops.items()}
    average = sum(rates.values()) / len(rates) if rates else 0.0

    rows = []
    for label, total in sorted(tops.items(), key=lambda kv: kv[1], reverse=True)[:limit]:
        rate = rates[label]
        # Only flag segments with enough volume to be worth reading.
        tone = "neutral"
        if total >= 10 and rate >= average * 1.2:
            tone = "positive"
        elif total >= 10 and rate <= average * 0.8:
            tone = "attention"
        rows.append(ComparisonRow(
            label=label, value=total, secondary=convs.get(label, 0), rate=rate, tone=tone
        ))
    return rows


def _period_change(db, org_id, event_name, start, end) -> Optional[float]:
    """Percentage change in an event's volume against the preceding window."""
    span = end - start
    if span.total_seconds() <= 0:
        return None

    def count(lo, hi):
        return db.query(func.count(Event.id)).filter(
            Event.organization_id == org_id,
            Event.event_name == event_name,
            Event.timestamp >= lo, Event.timestamp <= hi,
        ).scalar() or 0

    previous = count(start - span, start)
    current = count(start, end)
    if not previous:
        return None
    return round((current - previous) / previous * 100, 1)


def _insights(db, org_id, base, role, start, end, *, viewers, carters, buyers,
              active_users, comparisons, funnel) -> list[InsightItem]:
    """
    Findings derived from the dataset. Every number here comes from a query —
    nothing is hardcoded, and a line is omitted when its data is absent.
    """
    out: list[InsightItem] = []

    # Week-on-week movement in the two headline product actions
    views_change = _period_change(db, org_id, "product_viewed", start, end)
    cart_change = _period_change(db, org_id, "add_to_cart", start, end)
    if views_change is not None and cart_change is not None:
        direction = "increased" if views_change >= 0 else "declined"
        cart_dir = "rose" if cart_change >= 0 else "fell"
        out.append(InsightItem(
            text=(f"Product views {direction} {abs(views_change)}% versus the previous "
                  f"period while add-to-cart {cart_dir} {abs(cart_change)}%."),
            tone="attention" if (views_change > 0 and cart_change < 0) else "neutral",
        ))
    elif cart_change is not None:
        out.append(InsightItem(
            text=f"Add-to-cart volume changed {cart_change}% versus the previous period.",
            tone="attention" if cart_change < 0 else "positive",
        ))

    # Segments worth acting on, straight from the comparison rows
    weak = [c for c in comparisons if c.tone == "attention"]
    strong = [c for c in comparisons if c.tone == "positive"]
    if weak:
        w = max(weak, key=lambda c: c.value)
        out.append(InsightItem(
            text=(f"{w.label} draws {w.value:,} users but converts at {w.rate}% — "
                  f"below the average across this breakdown."),
            tone="attention",
        ))
    if strong:
        b = max(strong, key=lambda c: c.rate)
        out.append(InsightItem(
            text=f"{b.label} converts best at {b.rate}% from {b.value:,} users.",
            tone="positive",
        ))

    # The single largest funnel loss, named as the transition it happens on —
    # users are lost *between* two stages, not "at" the one they never reach.
    if len(funnel) > 1:
        worst_index = max(range(1, len(funnel)), key=lambda i: funnel[i].drop_off)
        worst = funnel[worst_index]
        previous = funnel[worst_index - 1]
        if worst.drop_off > 0:
            out.append(InsightItem(
                text=(f"Biggest leak is between “{previous.step}” and “{worst.step}”: "
                      f"{worst.drop_off}% of the {previous.users:,} users who got that far "
                      f"do not continue."),
                tone="attention",
            ))

    # Do review readers convert better? A real behavioural correlation.
    if role in (ROLE_PRODUCT, ROLE_RESEARCH, ROLE_EXECUTIVE):
        readers = set(
            r[0] for r in base.filter(Event.event_name == "review_viewed")
            .with_entities(Event.end_user_id).distinct().all()
        )
        carted = set(
            r[0] for r in base.filter(Event.event_name == "add_to_cart")
            .with_entities(Event.end_user_id).distinct().all()
        )
        non_readers = active_users - len(readers)
        if readers and non_readers > 0:
            reader_rate = _pct(len(readers & carted), len(readers))
            other_rate = _pct(len(carted - readers), non_readers)
            if reader_rate > other_rate:
                out.append(InsightItem(
                    text=(f"Users who read reviews add to cart {reader_rate}% of the time "
                          f"versus {other_rate}% for those who don't."),
                    tone="positive",
                ))

    # Payment reliability — a believable last-step loss
    attempts = _users_with(base, "payment_attempted")
    failures = _users_with(base, "payment_failed")
    if attempts and failures:
        out.append(InsightItem(
            text=(f"{_pct(failures, attempts)}% of users who reached payment hit a "
                  f"failure ({failures:,} of {attempts:,})."),
            tone="attention",
        ))

    # Returning versus first-time conversion
    if role in (ROLE_GROWTH, ROLE_EXECUTIVE):
        multi = set(
            r[0] for r in base.with_entities(Event.end_user_id)
            .group_by(Event.end_user_id)
            .having(func.count(distinct(Event.session_id)) > 1).all()
        )
        bought = set(
            r[0] for r in base.filter(Event.event_name == CONVERSION_EVENT)
            .with_entities(Event.end_user_id).distinct().all()
        )
        single = active_users - len(multi)
        if multi and single > 0:
            ret_rate = _pct(len(multi & bought), len(multi))
            new_rate = _pct(len(bought - multi), single)
            if ret_rate != new_rate:
                better = "better" if ret_rate > new_rate else "worse"
                out.append(InsightItem(
                    text=(f"Returning users convert {better}: {ret_rate}% versus "
                          f"{new_rate}% for single-session users."),
                    tone="positive" if ret_rate > new_rate else "attention",
                ))

    return out[:6]


def effective_window(
    start_date: Optional[str], end_date: Optional[str]
) -> tuple[datetime, datetime]:
    """
    Resolve the analytics window from optional ISO dates.

    Used by the /analytics route AND by the AI tools, so "the last 30 days"
    means exactly the same span in both places. Malformed input falls back to
    the default rather than raising.
    """
    now = datetime.now(timezone.utc)
    try:
        start = (datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
                 if start_date else now - timedelta(days=DEFAULT_WINDOW_DAYS))
    except (ValueError, TypeError):
        start = now - timedelta(days=DEFAULT_WINDOW_DAYS)
    try:
        end = (datetime.fromisoformat(end_date).replace(tzinfo=timezone.utc)
               if end_date else now)
    except (ValueError, TypeError):
        end = now
    if start > end:
        start, end = end, start
    return start, end


def compute_analytics(
    db: Session,
    *,
    org_id: Optional[int],
    role: str,
    start: datetime,
    end: datetime,
    age_group: str = "",
    gender_val: str = "",
    feature_val: str = "",
) -> AnalyticsResponse:
    """
    The analytics engine. Called by the /analytics route AND by the dashboard
    AI's tools, so the assistant reads exactly the numbers the dashboard shows
    rather than recomputing them a second way.

    org_id is always supplied by the caller from the authenticated user — it is
    never taken from client input.
    """
    # ── Shared base query: this organization's end-user events ───────────────
    base = (
        db.query(Event)
        .join(EndUser, Event.end_user_id == EndUser.id)
        .filter(
            Event.organization_id == org_id,
            Event.timestamp >= start,
            Event.timestamp <= end,
        )
    )
    base = _apply_age_filter(base, age_group)
    if gender_val and gender_val != "All":
        base = base.filter(EndUser.gender == gender_val)

    # ── Existing contract: events per name, and a daily trend ────────────────
    bar_rows = (
        base.with_entities(Event.event_name, func.count(Event.id).label("total"))
        .group_by(Event.event_name)
        .order_by(func.count(Event.id).desc())
        .all()
    )
    bar_chart = [BarChartItem(feature_name=r[0], total_clicks=r[1]) for r in bar_rows]
    total_events = sum(b.total_clicks for b in bar_chart)

    selected_feature = feature_val or (bar_chart[0].feature_name if bar_chart else None)
    line_chart: list[LineChartItem] = []
    if selected_feature:
        line_rows = (
            base.filter(Event.event_name == selected_feature)
            .with_entities(
                func.date_trunc("day", Event.timestamp).label("day"),
                func.count(Event.id).label("cnt"),
            )
            .group_by(text("day"))
            .order_by(text("day"))
            .all()
        )
        line_chart = [
            LineChartItem(
                date=r[0].strftime("%Y-%m-%d") if hasattr(r[0], "strftime") else str(r[0])[:10],
                clicks=r[1],
            )
            for r in line_rows
        ]

    # ── Figures shared by every perspective ──────────────────────────────────
    active_users = base.with_entities(func.count(distinct(Event.end_user_id))).scalar() or 0
    sessions = base.with_entities(func.count(distinct(Event.session_id))).scalar() or 0
    events_per_session = round(total_events / sessions, 1) if sessions else 0.0

    result = AnalyticsResponse(
        bar_chart=bar_chart,
        line_chart=line_chart,
        selected_feature=selected_feature,
        total_events=total_events,
        role=role,
        role_label=ROLES.get(role, "Member"),
    )

    # ═════════════════════════════════════════════════════════════════════════
    #  Same dataset, four perspectives
    # ═════════════════════════════════════════════════════════════════════════
    viewers = _users_with(base, "product_viewed")
    carters = _users_with(base, "add_to_cart")
    checkouts = _users_with(base, "checkout_started")
    buyers = _users_with(base, CONVERSION_EVENT)

    if role == ROLE_PRODUCT:
        result.perspective = "Product adoption and drop-off across the marketplace"
        result.question = "What are users doing inside the product, and where do they drop off?"
        result.can_learn = [
            "Which product categories earn attention but fail to convert",
            "Where in the shopping journey users stop progressing",
            "Which behaviours are associated with users who do buy",
        ]
        feature_rows = [b for b in bar_chart if b.feature_name in FEATURE_EVENTS]
        least = feature_rows[-1].feature_name.replace("_", " ") if feature_rows else "—"
        result.kpis = [
            KpiItem(label="Active Users", value=f"{active_users:,}", sub=f"{sessions:,} sessions", tone="accent"),
            KpiItem(label="Add-to-Cart Rate", value=f"{_pct(carters, viewers)}%", sub=f"{carters:,} of {viewers:,} viewers", tone="success"),
            KpiItem(label="Checkout Rate", value=f"{_pct(checkouts, carters)}%", sub=f"{checkouts:,} started checkout", tone="success-alt"),
            KpiItem(label="Least Used Feature", value=least, sub="lowest-volume discretionary action", tone="text-secondary"),
        ]
        result.funnel_title = "Marketplace funnel — where users drop off"
        result.funnel = _build_funnel(base, PRODUCT_FUNNEL)
        result.comparisons_title = "Category performance"
        result.comparison_columns = ["Category", "Viewers", "Buyers", "Conv."]
        result.comparisons = _breakdown(base, Event.category, "product_viewed", CONVERSION_EVENT)

    elif role == ROLE_GROWTH:
        result.perspective = "Acquisition, activation, conversion and return behaviour"
        result.question = "Where do users come from, do they activate, convert, and come back?"
        result.can_learn = [
            "Which acquisition channels bring volume versus which bring buyers",
            "Where the signup-to-purchase funnel leaks most",
            "Whether returning users are worth more than new ones",
        ]
        new_users = (
            db.query(func.count(EndUser.id))
            .filter(EndUser.organization_id == org_id,
                    EndUser.signed_up_at >= start, EndUser.signed_up_at <= end)
            .scalar() or 0
        )
        activated = _users_with(base, ACTIVATION_EVENT)
        returning = (
            base.with_entities(Event.end_user_id)
            .group_by(Event.end_user_id)
            .having(func.count(distinct(Event.session_id)) > 1)
            .count()
        )
        result.kpis = [
            KpiItem(label="New Users", value=f"{new_users:,}", sub="signed up in range", tone="accent"),
            KpiItem(label="Activation", value=f"{_pct(activated, active_users)}%", sub=f"{activated:,} completed onboarding", tone="success"),
            KpiItem(label="Conversion", value=f"{_pct(buyers, active_users)}%", sub=f"{buyers:,} purchases", tone="success-alt"),
            KpiItem(label="Returning", value=f"{_pct(returning, active_users)}%", sub="more than one session", tone="text-secondary"),
        ]
        result.funnel_title = "Signup → activation → engagement → conversion"
        result.funnel = _build_funnel(base, GROWTH_FUNNEL)
        src_rows = (
            base.with_entities(EndUser.acquisition_source, func.count(distinct(Event.end_user_id)))
            .group_by(EndUser.acquisition_source)
            .order_by(func.count(distinct(Event.end_user_id)).desc())
            .all()
        )
        result.segments_title = "Acquisition source"
        result.segments = [
            SegmentItem(label=r[0], users=r[1], share=_pct(r[1], active_users)) for r in src_rows
        ]
        result.comparisons_title = "Channel quality"
        result.comparison_columns = ["Source", "Users", "Buyers", "Conv."]
        result.comparisons = _breakdown(
            base, EndUser.acquisition_source, "session_started", CONVERSION_EVENT
        )

    elif role == ROLE_RESEARCH:
        result.perspective = "Observed behaviour, repeated actions and friction"
        result.question = "How do users actually behave, and where do they struggle?"
        result.can_learn = [
            "The paths users actually take, not the ones we designed",
            "Where users repeat actions or abandon — signals of friction",
            "How behaviour differs between mobile and desktop",
        ]
        repeated = (
            base.with_entities(Event.end_user_id, Event.event_name)
            .group_by(Event.end_user_id, Event.event_name)
            .having(func.count(Event.id) >= 3)
            .count()
        )
        abandons = base.filter(Event.event_name.in_(ABANDON_EVENTS)).with_entities(
            func.count(Event.id)).scalar() or 0
        funnel = _build_funnel(base, PRODUCT_FUNNEL)
        friction = max(funnel[1:], key=lambda f: f.drop_off) if len(funnel) > 1 else None
        result.kpis = [
            KpiItem(label="Sessions Observed", value=f"{sessions:,}", sub=f"{active_users:,} distinct users", tone="accent"),
            KpiItem(label="Events / Session", value=f"{events_per_session}", sub="depth of engagement", tone="success"),
            KpiItem(label="Repeated Actions", value=f"{repeated:,}", sub="same action 3+ times", tone="success-alt"),
            KpiItem(label="Abandon Signals", value=f"{abandons:,}", sub="carts, checkouts, failures", tone="warning"),
        ]
        result.funnel_title = "Where users struggle"
        result.funnel = funnel
        result.comparisons_title = "Friction by device"
        result.comparison_columns = ["Device", "Checkouts", "Purchases", "Completed"]
        result.comparisons = _breakdown(
            base, Event.device, "checkout_started", CONVERSION_EVENT, limit=4
        )
        seq_rows = db.execute(text("""
            SELECT a.event_name || ' → ' || b.event_name AS path, COUNT(*) AS n
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
            GROUP BY path
            ORDER BY n DESC
            LIMIT 6
        """), {"org": org_id, "start": start, "end": end}).fetchall()
        result.sequences = [
            SequenceItem(path=r[0].replace("_", " "), occurrences=r[1]) for r in seq_rows
        ]

    else:  # ROLE_EXECUTIVE — a combined read of the same data
        result.perspective = "Combined Product, Growth and Research signals"
        result.question = "What is happening across the product overall?"
        result.can_learn = [
            "Overall product health in four numbers",
            "The single biggest leak in the customer journey",
            "Which channels and segments need attention this period",
        ]
        returning = (
            base.with_entities(Event.end_user_id)
            .group_by(Event.end_user_id)
            .having(func.count(distinct(Event.session_id)) > 1)
            .count()
        )
        result.kpis = [
            KpiItem(label="Active Users", value=f"{active_users:,}", sub=f"{sessions:,} sessions", tone="accent"),
            KpiItem(label="Engagement", value=f"{events_per_session}", sub="events per session", tone="success"),
            KpiItem(label="Conversion", value=f"{_pct(buyers, active_users)}%", sub=f"{buyers:,} purchases", tone="success-alt"),
            KpiItem(label="Retention", value=f"{_pct(returning, active_users)}%", sub="returning users", tone="text-secondary"),
        ]
        result.funnel_title = "Marketplace funnel overview"
        result.funnel = _build_funnel(base, PRODUCT_FUNNEL)
        result.comparisons_title = "Channel quality"
        result.comparison_columns = ["Source", "Users", "Buyers", "Conv."]
        result.comparisons = _breakdown(
            base, EndUser.acquisition_source, "session_started", CONVERSION_EVENT
        )

    # ═════════════════════════════════════════════════════════════════════════
    #  Insights — every line below is computed from the query above
    # ═════════════════════════════════════════════════════════════════════════
    result.insights = _insights(
        db, org_id, base, role, start, end,
        viewers=viewers, carters=carters, buyers=buyers,
        active_users=active_users, comparisons=result.comparisons,
        funnel=result.funnel,
    )

    return result


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    start_date: Optional[str] = Query(None, description="ISO-8601 start (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="ISO-8601 end   (YYYY-MM-DD)"),
    age: Optional[str] = Query(None, description="<18 | 18-40 | >40"),
    gender: Optional[str] = Query(None, description="Male | Female | Other"),
    feature: Optional[str] = Query(None, description="Event name for line-chart drill-down"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Analytics over the signed-in member's organization.

    Every member of a company reads the SAME end-user event dataset; their
    role only changes which questions the response answers.
    """
    start, end = effective_window(start_date, end_date)
    age_group  = age    or ""
    gender_val = gender or ""
    feature_val = feature or ""

    role = current_user.role or ROLE_PRODUCT
    org_id = current_user.organization_id

    # ── Cache check (scoped per organization AND role) ────────────────────────
    rdb = _get_redis()
    cache_key = (
        f"analytics:{org_id}:{role}:{start.date()}:{end.date()}"
        f":{age_group}:{gender_val}:{feature_val}"
    )
    if CACHE_ENABLED and rdb:
        try:
            cached = rdb.get(cache_key)
            if cached:
                logger.debug(f"cache_hit key={cache_key}")
                return AnalyticsResponse(**json.loads(cached))
        except Exception:
            pass

    result = compute_analytics(
        db,
        org_id=org_id,
        role=role,
        start=start,
        end=end,
        age_group=age_group,
        gender_val=gender_val,
        feature_val=feature_val,
    )

    # ── Cache store ──────────────────────────────────────────────────────────
    if CACHE_ENABLED and rdb:
        try:
            rdb.setex(cache_key, CACHE_TTL, result.model_dump_json())
        except Exception:
            pass

    return result
