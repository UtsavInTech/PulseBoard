from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, List


class UserCreate(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    # Legacy, optional: employee demographics are not part of the product model.
    age: Optional[int] = None
    gender: Optional[str] = None

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        allowed = {"Male", "Female", "Other"}
        if v not in allowed:
            raise ValueError(f"gender must be one of {allowed}")
        return v

    @field_validator("age")
    @classmethod
    def validate_age(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return v
        if v < 0 or v > 120:
            raise ValueError("age must be between 0 and 120")
        return v

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("username must be at least 3 characters")
        return v


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    """
    A signed-in PulseBoard member — an employee of a customer organization.

    Deliberately carries no age or gender: those describe the END USERS being
    analysed, and showing them here confused the two populations.
    """
    id: int
    username: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: str = "product_manager"
    role_label: str = "Product Manager"
    organization: Optional[str] = None
    product: Optional[str] = None
    is_demo: bool = False
    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class TrackEvent(BaseModel):
    feature_name: str

    @field_validator("feature_name")
    @classmethod
    def validate_feature(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 1 or len(v) > 100:
            raise ValueError("feature_name must be 1-100 chars")
        return v


class FeatureClickResponse(BaseModel):
    id: int
    feature_name: str
    timestamp: datetime
    model_config = {"from_attributes": True}


class BarChartItem(BaseModel):
    feature_name: str
    total_clicks: int


class LineChartItem(BaseModel):
    date: str
    clicks: int


class KpiItem(BaseModel):
    """A headline number for the signed-in member's role."""
    label: str
    value: str
    sub: str = ""
    tone: str = "accent"


class FunnelStep(BaseModel):
    step: str
    users: int
    conversion: float = 0.0   # % of the funnel's first step
    drop_off: float = 0.0     # % lost from the previous step


class SegmentItem(BaseModel):
    label: str
    users: int
    share: float = 0.0


class SequenceItem(BaseModel):
    """An observed path through the product, e.g. search → view → cart."""
    path: str
    occurrences: int


class ComparisonRow(BaseModel):
    """One row of a breakdown: category, device or acquisition source."""
    label: str
    value: int              # headline count (e.g. viewers)
    secondary: int = 0      # follow-through count (e.g. buyers)
    rate: float = 0.0       # secondary / value, as a percentage
    tone: str = "neutral"   # positive | attention | neutral


class InsightItem(BaseModel):
    """A finding computed from the dataset — never hardcoded copy."""
    text: str
    tone: str = "neutral"   # positive | attention | neutral


class AnalyticsResponse(BaseModel):
    # ── Existing contract, unchanged ──────────────────────────────────────
    bar_chart: List[BarChartItem]
    line_chart: List[LineChartItem]
    selected_feature: Optional[str] = None
    total_events: int = 0

    # ── Role-aware additions (same dataset, different perspective) ────────
    role: str = "product_manager"
    role_label: str = "Product Manager"
    perspective: str = ""
    question: str = ""
    can_learn: List[str] = []
    kpis: List[KpiItem] = []
    funnel: List[FunnelStep] = []
    funnel_title: str = ""
    segments: List[SegmentItem] = []
    segments_title: str = ""
    sequences: List[SequenceItem] = []
    insights: List[InsightItem] = []

    comparisons: List[ComparisonRow] = []
    comparisons_title: str = ""
    comparison_columns: List[str] = []
    demo_notice: str = (
        "Demo environment — all users, events and metrics shown are synthetic "
        "data generated for demonstration purposes."
    )


# ═══════════════════════════════════════════════════════════════════════════
#  AI assistant
# ═══════════════════════════════════════════════════════════════════════════

class ChatTurn(BaseModel):
    role: str
    content: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in {"user", "assistant"}:
            raise ValueError("role must be 'user' or 'assistant'")
        return v

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        v = v.strip()
        if len(v) > 4000:
            raise ValueError("content must be 4000 characters or fewer")
        return v


class ChatRequest(BaseModel):
    message: str
    history: List[ChatTurn] = []

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("message must not be empty")
        if len(v) > 2000:
            raise ValueError("message must be 2000 characters or fewer")
        return v

    @field_validator("history")
    @classmethod
    def cap_history(cls, v: List[ChatTurn]) -> List[ChatTurn]:
        return v[-12:]   # keep prompts bounded


class ChatResponse(BaseModel):
    reply: str
    demo_request_saved: bool = False


class AssistantStatus(BaseModel):
    available: bool
    documents: List[str] = []


class DemoRequestCreate(BaseModel):
    name: str
    email: str
    phone: str
    preferred_time: str
    company: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("name", "phone", "preferred_time")
    @classmethod
    def validate_required(cls, v: str) -> str:
        v = (v or "").strip()
        if len(v) < 2:
            raise ValueError("field must be at least 2 characters")
        if len(v) > 120:
            raise ValueError("field must be 120 characters or fewer")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = (v or "").strip()
        if "@" not in v or "." not in v.split("@")[-1] or len(v) < 5 or len(v) > 200:
            raise ValueError("a valid email address is required")
        return v


class DemoRequestResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    preferred_time: str
    company: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}


class DashboardFilterContext(BaseModel):
    """The filters currently applied on the dashboard, for shared context."""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    age: Optional[str] = None
    gender: Optional[str] = None


class DashboardChatRequest(BaseModel):
    message: str
    history: List[ChatTurn] = []
    context: Optional[DashboardFilterContext] = None

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("message must not be empty")
        if len(v) > 2000:
            raise ValueError("message must be 2000 characters or fewer")
        return v

    @field_validator("history")
    @classmethod
    def cap_history(cls, v: List[ChatTurn]) -> List[ChatTurn]:
        return v[-12:]


class DashboardAssistantInfo(BaseModel):
    """What the panel needs to render before the first question."""
    available: bool
    role: str
    role_label: str
    organization: Optional[str] = None
    product: Optional[str] = None
    suggestions: List[str] = []
