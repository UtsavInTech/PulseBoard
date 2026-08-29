import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt as _bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from . import models

logger = logging.getLogger(__name__)
settings = get_settings()
security = HTTPBearer(auto_error=True)


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token. sub MUST be a string per JWT spec."""
    to_encode = data.copy()
    # Coerce sub to string (JWT spec requires string subject)
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    expire = _utcnow() + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> models.User:
    """FastAPI dependency: decode JWT and return the authenticated User."""
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        sub: Optional[str] = payload.get("sub")
        if sub is None:
            raise exc
        user_id = int(sub)
    except (JWTError, ValueError, TypeError) as e:
        logger.warning(f"JWT decode error: {e}")
        raise exc

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise exc
    return user
