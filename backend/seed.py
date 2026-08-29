"""
Seed Meridian Retail — a synthetic e-commerce marketplace.

    ONE COMPANY → ONE PRODUCT → ONE END-USER DATASET → ROLE-SPECIFIC VIEWS

All data here is SYNTHETIC and generated for demonstration. It is modelled on
real-world marketplace behaviour but contains no real company's data.

The generator deliberately plants patterns for PulseBoard to discover, rather
than drawing independent random numbers:

  * Electronics gets the most views but converts below the marketplace average
  * Home & Kitchen converts well on lower volume
  * Mobile carries more traffic but abandons checkout more than desktop
  * Paid Social brings volume with weak conversion; Email/Referral convert well
  * Users who read reviews add to cart more often
  * Returning users convert better than first-time visitors
  * Payment failures cause a real, measurable drop at the last step

Usage:
    cd backend && python seed.py
"""
import random
import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine, ensure_schema
from app.models import (
    Base, Organization, User, EndUser, Event, MemberActivity,
    ROLE_PRODUCT, ROLE_GROWTH, ROLE_RESEARCH, ROLE_EXECUTIVE, ROLES,
)
from app.auth import hash_password

random.seed(20260829)

ORG_NAME = "Meridian Retail"
PRODUCT_NAME = "Meridian Shop"

# PulseBoard members are employees: a name, a work email, a role and a company.
# No demographics — those belong to the end users they analyse.
SEED_MEMBERS = [
    {"username": "utsav",  "password": "password123", "role": ROLE_PRODUCT,
     "full_name": "Utsav Kumar",  "email": "utsav.kumar@meridianretail.com"},
    {"username": "utsav1", "password": "password123", "role": ROLE_GROWTH,
     "full_name": "Utsav Verma",  "email": "utsav.verma@meridianretail.com"},
    {"username": "utsav2", "password": "password123", "role": ROLE_RESEARCH,
     "full_name": "Utsav Rao",    "email": "utsav.rao@meridianretail.com"},
    {"username": "utsav3", "password": "password123", "role": ROLE_EXECUTIVE,
     "full_name": "Utsav Sharma", "email": "utsav.sharma@meridianretail.com"},
]

LEGACY_SEED_USERNAMES = [
    "alice", "bob", "charlie", "diana", "eve",
    "frank", "grace", "henry", "iris", "jack",
]

NUM_END_USERS = 260
DAYS_OF_HISTORY = 60

# ─── Category mix: (name, share of browsing, conversion multiplier) ──────────
# Electronics dominates attention but converts poorly; Home & Kitchen is the
# quiet performer. These multipliers are what the analytics should surface.
CATEGORIES = [
    ("Electronics",     30, 0.62),
    ("Fashion",         22, 0.95),
    ("Home & Kitchen",  16, 1.38),
    ("Beauty",          12, 1.18),
    ("Sports",          10, 0.88),
    ("Books",            6, 1.25),
    ("Grocery",          4, 1.45),
]
CATEGORY_NAMES = [c[0] for c in CATEGORIES]
CATEGORY_WEIGHTS = [c[1] for c in CATEGORIES]
CATEGORY_CONVERSION = {c[0]: c[2] for c in CATEGORIES}

# ─── Device: mobile brings traffic, desktop completes checkout ──────────────
DEVICES = ["mobile", "desktop", "tablet"]
DEVICE_WEIGHTS = [58, 34, 8]
DEVICE_CHECKOUT_MULTIPLIER = {"mobile": 0.72, "desktop": 1.30, "tablet": 0.94}
BROWSERS = {
    "mobile":  [("Chrome Mobile", 52), ("Safari Mobile", 40), ("Samsung Internet", 8)],
    "desktop": [("Chrome", 62), ("Safari", 20), ("Edge", 12), ("Firefox", 6)],
    "tablet":  [("Safari", 60), ("Chrome", 40)],
}

# ─── Acquisition: volume does not equal quality ─────────────────────────────
SOURCES = [
    ("Organic Search", 30, 1.20),
    ("Paid Social",    26, 0.58),
    ("Direct",         18, 1.15),
    ("Email",          14, 1.42),
    ("Referral",       12, 1.30),
]
SOURCE_NAMES = [s[0] for s in SOURCES]
SOURCE_WEIGHTS = [s[1] for s in SOURCES]
SOURCE_CONVERSION = {s[0]: s[2] for s in SOURCES}

GENDERS = ["Male", "Female", "Other"]
GENDER_WEIGHTS = [46, 46, 8]
COUNTRIES = ["India", "United States", "United Kingdom", "Germany", "Singapore", "Australia"]
COUNTRY_WEIGHTS = [42, 21, 12, 10, 8, 7]

# ─── Base funnel probabilities, before per-segment multipliers ──────────────
P_ONBOARD = 0.64          # of first sessions that finish onboarding
P_BROWSE = 0.88           # sessions that get past the homepage
P_SEARCH = 0.62
P_PRODUCT_VIEW = 0.86
P_REVIEW_VIEW = 0.34
P_WISHLIST = 0.16
P_ADD_TO_CART = 0.34
P_REVIEW_CART_BOOST = 1.45   # review readers add to cart more often
P_CART_VIEW = 0.86
P_CHECKOUT = 0.58
P_ADDRESS = 0.88
P_PAYMENT = 0.90
P_PAYMENT_SUCCESS = 0.88     # ~12% of payment attempts fail
P_RETRY_AFTER_FAILURE = 0.42
P_ORDER_CANCELLED = 0.05
RETURNING_CONVERSION_BOOST = 1.42


def _weighted(pairs):
    names = [p[0] for p in pairs]
    weights = [p[1] for p in pairs]
    return random.choices(names, weights=weights, k=1)[0]


def _clamp(p):
    return max(0.01, min(0.97, p))


def _reset(db, org):
    """Remove the previous demo organization and everything belonging to it."""
    end_user_ids = [r[0] for r in db.query(EndUser.id).filter(EndUser.organization_id == org.id).all()]
    if end_user_ids:
        db.query(Event).filter(Event.end_user_id.in_(end_user_ids)).delete(synchronize_session=False)
        db.query(EndUser).filter(EndUser.id.in_(end_user_ids)).delete(synchronize_session=False)
    seed_usernames = [m["username"] for m in SEED_MEMBERS] + LEGACY_SEED_USERNAMES
    member_ids = [
        r[0] for r in db.query(User.id)
        .filter((User.organization_id == org.id) | (User.username.in_(seed_usernames)))
        .all()
    ]
    if member_ids:
        db.query(MemberActivity).filter(MemberActivity.user_id.in_(member_ids)).delete(synchronize_session=False)
        db.query(User).filter(User.id.in_(member_ids)).delete(synchronize_session=False)
    db.commit()
    return len(end_user_ids), len(member_ids)


def _backfill_orphan_members(db, org):
    orphans = db.query(User).filter(User.organization_id.is_(None)).all()
    for u in orphans:
        u.organization_id = org.id
        if not u.role:
            u.role = ROLE_PRODUCT
    if orphans:
        db.commit()
    return [u.username for u in orphans]


class SessionBuilder:
    """Accumulates one visit's events with plausible timing."""

    def __init__(self, org_id, end_user, session_no, start, device, browser):
        self.org_id = org_id
        self.eu = end_user
        self.sid = f"s-{end_user.id}-{session_no}"
        self.t = start
        self.device = device
        self.browser = browser
        self.events = []

    def add(self, name, gap=(15, 180), category=None, product_id=None):
        self.t = self.t + timedelta(seconds=random.randint(*gap))
        self.events.append(Event(
            organization_id=self.org_id,
            end_user_id=self.eu.id,
            session_id=self.sid,
            event_name=name,
            timestamp=self.t,
            category=category,
            product_id=product_id,
            device=self.device,
            browser=self.browser,
        ))


def build_session(org_id, end_user, session_no, start, source):
    """One realistic visit. Returns the event list."""
    device = _weighted(list(zip(DEVICES, DEVICE_WEIGHTS)))
    browser = _weighted(BROWSERS[device])
    s = SessionBuilder(org_id, end_user, session_no, start, device, browser)
    returning = session_no > 0

    s.add("session_started", (1, 5))
    if session_no == 0:
        s.add("signup", (10, 60))
        if random.random() < P_ONBOARD:
            s.add("onboarding_complete", (20, 240))
    s.add("homepage_viewed", (5, 40))

    if random.random() > P_BROWSE:
        return s.events  # bounced on the homepage

    if random.random() < P_SEARCH:
        s.add("search", (8, 90))

    category = random.choices(CATEGORY_NAMES, weights=CATEGORY_WEIGHTS, k=1)[0]
    s.add("category_viewed", (6, 60), category=category)

    if random.random() > P_PRODUCT_VIEW:
        return s.events

    # Repeat browsing — some users look at several products
    read_review = False
    for _ in range(random.randint(1, 5)):
        pid = f"P{random.randint(1000, 9999)}"
        s.add("product_viewed", (10, 150), category=category, product_id=pid)
        if random.random() < P_REVIEW_VIEW:
            s.add("review_viewed", (15, 120), category=category, product_id=pid)
            read_review = True
        if random.random() < P_WISHLIST:
            s.add("wishlist_added", (5, 45), category=category, product_id=pid)

    # ── Add to cart, shaped by category, source, reviews and repeat visits ──
    p_cart = P_ADD_TO_CART * CATEGORY_CONVERSION[category] * SOURCE_CONVERSION[source]
    if read_review:
        p_cart *= P_REVIEW_CART_BOOST
    if returning:
        p_cart *= RETURNING_CONVERSION_BOOST
    if random.random() > _clamp(p_cart):
        return s.events

    pid = f"P{random.randint(1000, 9999)}"
    s.add("add_to_cart", (8, 60), category=category, product_id=pid)

    if random.random() > P_CART_VIEW:
        s.add("cart_abandoned", (300, 2400), category=category)
        return s.events
    s.add("cart_viewed", (10, 120), category=category)

    # ── Checkout, where device matters most ────────────────────────────────
    p_checkout = P_CHECKOUT * DEVICE_CHECKOUT_MULTIPLIER[device]
    if returning:
        p_checkout *= 1.18
    if random.random() > _clamp(p_checkout):
        s.add("cart_abandoned", (200, 1800), category=category)
        return s.events

    s.add("checkout_started", (12, 90), category=category)

    if random.random() > P_ADDRESS:
        s.add("checkout_abandoned", (120, 900), category=category)
        return s.events
    s.add("address_added", (20, 180), category=category)

    if random.random() > P_PAYMENT:
        s.add("checkout_abandoned", (120, 900), category=category)
        return s.events

    s.add("payment_attempted", (15, 120), category=category)
    if random.random() > P_PAYMENT_SUCCESS:
        s.add("payment_failed", (5, 30), category=category)
        if random.random() < P_RETRY_AFTER_FAILURE:
            s.add("payment_attempted", (30, 240), category=category)
            if random.random() > P_PAYMENT_SUCCESS:
                s.add("payment_failed", (5, 30), category=category)
                return s.events
        else:
            return s.events

    s.add("purchase_completed", (10, 60), category=category, product_id=pid)
    if random.random() < P_ORDER_CANCELLED:
        s.add("order_cancelled", (3600, 172800), category=category)
    return s.events


def seed():
    print("Seeding PulseBoard demo data (synthetic)…")
    Base.metadata.create_all(bind=engine)
    ensure_schema()
    db = SessionLocal()
    try:
        org = db.query(Organization).filter(Organization.name == ORG_NAME).first()
        if org:
            removed_eu, removed_m = _reset(db, org)
            print(f"  Cleared previous demo data ({removed_eu} end users, {removed_m} members)")
        else:
            org = Organization(name=ORG_NAME, product_name=PRODUCT_NAME)
            db.add(org); db.commit(); db.refresh(org)
        print(f"  Organization: {org.name} — product “{org.product_name}”")

        for m in SEED_MEMBERS:
            db.add(User(
                username=m["username"], password=hash_password(m["password"]),
                full_name=m["full_name"], email=m["email"], role=m["role"],
                organization_id=org.id,
            ))
        db.commit()
        print(f"  Created {len(SEED_MEMBERS)} PulseBoard members")

        adopted = _backfill_orphan_members(db, org)
        if adopted:
            print(f"  Attached {len(adopted)} pre-existing account(s): {', '.join(adopted)}")

        now = datetime.utcnow()
        end_users, sources = [], {}
        for i in range(NUM_END_USERS):
            src = random.choices(SOURCE_NAMES, weights=SOURCE_WEIGHTS, k=1)[0]
            eu = EndUser(
                organization_id=org.id,
                external_id=f"eu_{i + 1:04d}",
                age=random.randint(16, 66),
                gender=random.choices(GENDERS, weights=GENDER_WEIGHTS, k=1)[0],
                acquisition_source=src,
                signed_up_at=now - timedelta(
                    days=random.randint(0, DAYS_OF_HISTORY), hours=random.randint(0, 23)
                ),
                country=random.choices(COUNTRIES, weights=COUNTRY_WEIGHTS, k=1)[0],
            )
            end_users.append(eu)
        db.add_all(end_users)
        db.commit()
        for eu in end_users:
            db.refresh(eu)
            sources[eu.id] = eu.acquisition_source
        print(f"  Created {len(end_users)} synthetic end users")

        all_events = []
        for eu in end_users:
            # Email/Referral users come back more often
            base = [46, 24, 15, 9, 6]
            if sources[eu.id] in ("Email", "Referral"):
                base = [30, 25, 20, 14, 11]
            num_sessions = random.choices([1, 2, 3, 4, 5], weights=base, k=1)[0]
            cursor = eu.signed_up_at
            for n in range(num_sessions):
                if cursor > now:
                    break
                all_events.extend(build_session(org.id, eu, n, cursor, sources[eu.id]))
                cursor = cursor + timedelta(days=random.randint(1, 11), hours=random.randint(0, 20))

        db.bulk_save_objects(all_events)
        db.commit()
        print(f"  Created {len(all_events):,} synthetic end-user events")

        print("\nSeed complete.\n")
        print(f"All members below belong to {org.name} and read the SAME dataset:")
        for m in SEED_MEMBERS:
            print(f"   {m['username']:<7} / {m['password']}   →  {m['full_name']}, {ROLES[m['role']]}")
    except Exception as exc:
        db.rollback()
        print(f"\nSeed failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
