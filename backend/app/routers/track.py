import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import MemberActivity, User
from ..schemas import TrackEvent, FeatureClickResponse
from ..auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(tags=["tracking"])


@router.post("/track", response_model=FeatureClickResponse, status_code=status.HTTP_201_CREATED)
async def track_event(
    event: TrackEvent,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Record how the signed-in PulseBoard member is using the dashboard.

    This is member telemetry, deliberately stored apart from the end-user
    Event table that /analytics reads — an employee's clicks must never
    appear in the product data they are analysing.
    """
    click = MemberActivity(
        user_id=current_user.id,
        feature_name=event.feature_name,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(click)
    db.commit()
    db.refresh(click)
    logger.info(f"member_activity feature={event.feature_name} user_id={current_user.id}")
    return click
