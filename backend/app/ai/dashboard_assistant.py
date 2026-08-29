"""
The authenticated dashboard assistant.

Separate from the public website assistant in app/ai/assistant.py: that one
answers product questions from a static knowledge base and captures leads. This
one answers ANALYTICAL questions by querying the signed-in user's organization
data through the tools in analytics_tools.py.

It reuses the same OpenAI client, request builder and streaming shape, so there
is one integration to maintain rather than two.
"""
import json
import logging
from typing import Callable, Optional

from ..models import ROLE_PRODUCT, ROLE_GROWTH, ROLE_RESEARCH, ROLE_EXECUTIVE
from .analytics_tools import ANALYTICS_TOOLS
from .assistant import (
    AssistantError, _extract_text, _get_client, _request_kwargs, _tool_calls,
)

logger = logging.getLogger(__name__)

# ─── Rules that apply whatever the role ──────────────────────────────────────
BASE_RULES = """\
You are the PulseBoard Analytics Assistant, working inside the authenticated
dashboard of a company that uses PulseBoard to understand its own product.

GROUNDING — the most important rule:
Never invent numbers, trends, causes, users, features or companies. Every
figure you state must come from a tool result in this conversation. If you have
not called a tool, you do not know the answer — call one. If the tools cannot
answer the question, say so plainly and explain what PulseBoard does not track.

SEPARATE FACT FROM INTERPRETATION. State what the data shows first, then any
interpretation, and label it as such. For example:
  "Paid Social converts at 17.2% against 31.2% for Referral."
  "That suggests Paid Social is worth investigating, though the data alone
   does not establish why it underperforms."

DIRECTION: when comparing two figures, state which is larger and check the
word you use against the numbers you just quoted. "Up" means the newer figure
is higher. Getting this backwards destroys trust in the whole answer.

DO NOT SUM DISTINCT COUNTS across time buckets — the same user appearing on two
days is one user, not two. Tool results tell you which figures are safe to add.

CITE THE EVIDENCE. Where it helps, give the counts behind a rate — "based on 64
users and 11 purchases" — so the reader can judge whether the number is solid.
Call out small samples rather than presenting them as firm findings.

AMBIGUITY: if a question could mean several things ("how did we grow?"), ask one
short clarifying question rather than guessing. Do not ask more than one.

YOU DO NOT CHOOSE DATE RANGES OR FILTERS. The tools take no date or
demographic parameters. The window comes from the dashboard the user is looking
at, and demographic filters come from the filters they have applied. This is
deliberate: your figures must match their screen.

To read a different span, pass the 'period' argument:
  dashboard        the range currently selected (the default — use this)
  previous_period  the equal-length span immediately before it, for comparisons
  this_week / last_week      Monday-to-Sunday weeks
  this_month / last_month    calendar months
The server converts these to real dates and tells you which it used in
window_used. Quote that period when it is not the dashboard's own range, so the
user knows the figures differ from their screen and why.

WEEKEND VS WEEKDAY is already computed for you: get_daily_activity returns a
weekend_vs_weekday block with distinct users, sessions and events for each.
Use those numbers directly. Never derive them by adding up daily rows.

STYLE:
- Concise and professional. Lead with the answer, then the evidence.
- Plain text. No markdown headers, no bullet characters like * or #.
- Two or three short paragraphs at most unless asked for more.
- You are an analytics assistant, not a person.

The user is a colleague analysing their own company's product. The data
concerns their END USERS — the people using their product — never the employee
you are talking to.
"""

ROLE_PROMPTS = {
    ROLE_PRODUCT: """\
The person you are helping is a PRODUCT MANAGER. Their question is always some
form of: what are users using, what are they ignoring, and where do they drop
off? Favour feature and category adoption, the product funnel and its drop-off
points, comparisons between categories, and how usage changed over time. When
you find a weak segment, say what makes it weak relative to the others.""",

    ROLE_GROWTH: """\
The person you are helping is a GROWTH MANAGER. Their question is always some
form of: where do users come from, do they activate, convert and return?
Favour acquisition channels and their quality, new users, activation,
conversion, returning-user rates and period-over-period movement. Volume
without conversion is the thing they most need pointed out.""",

    ROLE_RESEARCH: """\
The person you are helping is a USER RESEARCHER. Their question is always some
form of: how do users actually behave, and where do they struggle? Favour
journeys and common paths, repeated actions, abandonment, session depth, and
differences between devices. They care about observed behaviour rather than
business KPIs, and about the difference between the journey we designed and the
one users actually take.""",

    ROLE_EXECUTIVE: """\
The person you are helping is an EXECUTIVE. Their question is always some form
of: what is happening overall, and what needs attention? Lead with the answer
in one or two sentences, then the few figures that support it. Cover product
health, conversion, retention and the largest risk or opportunity. Be brief —
they will ask for detail if they want it. Do not enumerate every metric.""",
}

# Starter questions offered when the panel opens — role-specific, and all
# answerable with the tools available.
ROLE_SUGGESTIONS = {
    ROLE_PRODUCT: [
        "Which product categories need attention?",
        "Where are users dropping off?",
        "How did product usage change this week?",
        "Which features are least used?",
    ],
    ROLE_GROWTH: [
        "Which acquisition channel converts best?",
        "How much did we grow this weekend?",
        "Is Paid Social performing well?",
        "Do returning users convert better?",
    ],
    ROLE_RESEARCH: [
        "What is the most common user journey?",
        "Where are users struggling?",
        "Do mobile users behave differently?",
        "Which actions get repeated most?",
    ],
    ROLE_EXECUTIVE: [
        "Give me a 30-second summary.",
        "What should I worry about?",
        "How is conversion trending?",
        "What are the biggest opportunities?",
    ],
}


def suggestions_for(role: str) -> list[str]:
    return ROLE_SUGGESTIONS.get(role, ROLE_SUGGESTIONS[ROLE_PRODUCT])


def _system_prompt(role: str, context: Optional[dict]) -> str:
    parts = [BASE_RULES, ROLE_PROMPTS.get(role, ROLE_PROMPTS[ROLE_PRODUCT])]
    if context:
        bits = []
        if context.get("today"):
            bits.append(f"today's date: {context['today']}")
        coverage = context.get("coverage") or {}
        if coverage.get("earliest_event"):
            bits.append(
                f"data available from {coverage['earliest_event']} to "
                f"{coverage['latest_event']} ({coverage.get('total_events', 0):,} events). "
                f"Queries outside this range return nothing."
            )
        if context.get("active_window"):
            bits.append(
                f"dashboard's active window (what 'dashboard' period resolves to): "
                f"{context['active_window']}"
            )
        if context.get("organization"):
            bits.append(f"organization: {context['organization']}")
        if context.get("product"):
            bits.append(f"product being analysed: {context['product']}")
        if bits:
            parts.append(
                "CURRENT DASHBOARD CONTEXT (mirror these filters in tool calls "
                "unless the question asks for a different period):\n"
                + "\n".join(f"- {b}" for b in bits)
            )
    return "\n\n".join(parts)


def _build_input(role, context, history, message) -> list[dict]:
    items = [{"role": "system", "content": _system_prompt(role, context)}]
    for turn in history or []:
        turn_role = turn.get("role")
        content = (turn.get("content") or "").strip()
        if turn_role in ("user", "assistant") and content:
            items.append({"role": turn_role, "content": content})
    items.append({"role": "user", "content": message})
    return items


def stream_dashboard_assistant(
    message: str,
    role: str,
    run_tool: Callable[[str, dict], dict],
    history: Optional[list[dict]] = None,
    context: Optional[dict] = None,
    max_tool_rounds: int = 4,
):
    """
    Answer one analytical question, streaming the reply.

    Yields ("delta", text) as the answer is produced, then exactly one terminal
    ("done", {"tools_used": [...]}) or ("error", str).

    run_tool is supplied by the router already bound to the authenticated user,
    so this function cannot widen data access even if the model asks it to.
    """
    client = _get_client()
    conversation = _build_input(role, context, history, message)
    used: list[str] = []

    try:
        for _round in range(max_tool_rounds):
            emitted = False
            with client.responses.stream(
                **_request_kwargs(conversation, ANALYTICS_TOOLS)
            ) as stream:
                for event in stream:
                    if getattr(event, "type", "") == "response.output_text.delta":
                        delta = getattr(event, "delta", "")
                        if delta:
                            emitted = True
                            yield ("delta", delta)
                final = stream.get_final_response()

            calls = _tool_calls(final)
            if not calls:
                if not emitted:
                    text = _extract_text(final)
                    yield ("delta", text or "I couldn't answer that from the available data.")
                break

            # Reasoning models need the reasoning item replayed alongside the call.
            conversation.extend(final.output)
            for call in calls:
                name = getattr(call, "name", "")
                try:
                    args = json.loads(getattr(call, "arguments", "") or "{}")
                except json.JSONDecodeError:
                    args = {}
                result = run_tool(name, args)
                used.append(name)
                conversation.append({
                    "type": "function_call_output",
                    "call_id": getattr(call, "call_id", ""),
                    "output": json.dumps(result, default=str),
                })
        else:
            yield ("delta", "\n\nI stopped after several data lookups without reaching "
                            "a conclusion. Could you narrow the question?")

        yield ("done", {"tools_used": used})
    except AssistantError:
        raise
    except Exception as exc:
        logger.error(
            "dashboard assistant stream failed (%s): %s",
            type(exc).__name__, str(exc)[:300],
        )
        yield ("error", "The analytics assistant is temporarily unavailable.")
