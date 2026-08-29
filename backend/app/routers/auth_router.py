import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Organization, User, ROLES, ROLE_PRODUCT
from ..schemas import UserCreate, UserLogin, Token, UserResponse
from ..auth import hash_password, verify_password, create_access_token

logger = logging.getLogger(__name__)
router = APIRouter(tags=["auth"])


# Usernames created by seed.py — surfaced in the UI as "Demo account".
DEMO_USERNAMES = {"utsav", "utsav1", "utsav2", "utsav3"}


def member_response(user: User) -> UserResponse:
    """Serialise a PulseBoard member together with their role and company."""
    org = user.organization
    return UserResponse(
        id=user.id,
        username=user.username,
        full_name=user.full_name or user.username,
        email=user.email,
        role=user.role or ROLE_PRODUCT,
        role_label=ROLES.get(user.role or ROLE_PRODUCT, "Member"),
        organization=org.name if org else None,
        product=org.product_name if org else None,
        is_demo=user.username in DEMO_USERNAMES,
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    """Register a new user and return a JWT token."""
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )
    # A new sign-up joins the existing demo organization so they land on a
    # populated dashboard. Real multi-tenant onboarding is out of scope here.
    org = db.query(Organization).order_by(Organization.id).first()
    user = User(
        username=payload.username,
        password=hash_password(payload.password),
        full_name=payload.full_name or payload.username,
        email=payload.email,
        age=payload.age,
        gender=payload.gender,
        role=ROLE_PRODUCT,
        organization_id=org.id if org else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": user.id})
    logger.info(f"New member registered: {user.username} (id={user.id})")
    return Token(access_token=token, token_type="bearer", user=member_response(user))


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """Authenticate a user and return a JWT token."""
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    token = create_access_token({"sub": user.id})
    logger.info(f"Member logged in: {user.username} role={user.role} (id={user.id})")
    return Token(access_token=token, token_type="bearer", user=member_response(user))
