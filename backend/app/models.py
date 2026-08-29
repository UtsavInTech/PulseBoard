from sqlalchemy import (
    Column, Integer, String, DateTime, Date, ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base


# ═══════════════════════════════════════════════════════════════════════════
#  PulseBoard's data model separates two populations that must never be
#  confused:
#
#    Organization ─┬─ User          (PulseBoard members: PM / Growth / …)
#                  └─ EndUser ── Event   (the company's own product users)
#
#  Members analyse events. End users generate them.
# ═══════════════════════════════════════════════════════════════════════════


class Organization(Base):
    """A company using PulseBoard, and the product it measures."""

    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), unique=True, nullable=False)
    product_name = Column(String(120), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    members = relationship("User", back_populates="organization")
    end_users = relationship("EndUser", back_populates="organization")


# ─── Roles ───────────────────────────────────────────────────────────────────
# A role changes the analytical perspective on the shared dataset. It is not a
# permission boundary and not a separate dataset.
ROLE_PRODUCT = "product_manager"
ROLE_GROWTH = "growth_manager"
ROLE_RESEARCH = "user_researcher"
ROLE_EXECUTIVE = "executive"

ROLES = {
    ROLE_PRODUCT: "Product Manager",
    ROLE_GROWTH: "Growth Manager",
    ROLE_RESEARCH: "User Researcher",
    ROLE_EXECUTIVE: "Executive",
}


class User(Base):
    """A PulseBoard member — an employee of an Organization who signs in."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    full_name = Column(String(120), nullable=True)
    email = Column(String(200), nullable=True)
    # Demographics of the PulseBoard employee are NOT part of their identity —
    # age/gender describe tracked end users, not the person analysing them.
    # These columns are legacy and are no longer surfaced anywhere.
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    role = Column(String(40), default=ROLE_PRODUCT, nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    organization = relationship("Organization", back_populates="members")
    activity = relationship("MemberActivity", back_populates="member", lazy="dynamic")


class EndUser(Base):
    """A person using the organization's product. Generates events."""

    __tablename__ = "end_users"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    external_id = Column(String(64), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False)
    acquisition_source = Column(String(40), nullable=False)
    signed_up_at = Column(DateTime, nullable=False)
    country = Column(String(60), nullable=True)

    organization = relationship("Organization", back_populates="end_users")
    events = relationship("Event", back_populates="end_user", lazy="dynamic")

    __table_args__ = (
        UniqueConstraint("organization_id", "external_id", name="uq_end_user_org_external"),
        Index("ix_eu_org_signup", "organization_id", "signed_up_at"),
    )


class Event(Base):
    """A single product interaction produced by an EndUser."""

    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    end_user_id = Column(Integer, ForeignKey("end_users.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(String(64), nullable=False)
    event_name = Column(String(100), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Context carried by the event itself. Nullable because not every event
    # relates to a product (a session_started has no category).
    category = Column(String(60), nullable=True)
    product_id = Column(String(40), nullable=True)
    device = Column(String(20), nullable=True)
    browser = Column(String(30), nullable=True)

    end_user = relationship("EndUser", back_populates="events")

    __table_args__ = (
        Index("ix_ev_org_timestamp", "organization_id", "timestamp"),
        Index("ix_ev_org_name_timestamp", "organization_id", "event_name", "timestamp"),
        Index("ix_ev_session", "session_id"),
        Index("ix_ev_enduser_timestamp", "end_user_id", "timestamp"),
        Index("ix_ev_org_category", "organization_id", "category"),
        Index("ix_ev_org_device", "organization_id", "device"),
    )


class MemberActivity(Base):
    """
    A PulseBoard member's own usage of the dashboard.

    Kept deliberately separate from Event: this is how employees use
    PulseBoard, never part of the end-user dataset they analyse.
    """

    __tablename__ = "member_activity"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    feature_name = Column(String(100), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    member = relationship("User", back_populates="activity")

    __table_args__ = (
        Index("ix_ma_feature_timestamp", "feature_name", "timestamp"),
        Index("ix_ma_user_timestamp", "user_id", "timestamp"),
    )


class DemoRequest(Base):
    """
    A visitor asking for a demo or a call, captured by the assistant.

    Deliberately unauthenticated and unrelated to User/EndUser: this is a
    prospect, not a member and not an end user.
    """

    __tablename__ = "demo_requests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(200), nullable=False, index=True)
    phone = Column(String(40), nullable=False)
    preferred_time = Column(String(120), nullable=False)
    company = Column(String(120), nullable=True)
    notes = Column(String(1000), nullable=True)
    source = Column(String(40), default="assistant", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (Index("ix_demo_requests_created", "created_at"),)
