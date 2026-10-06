import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import jwt

from backend.app.config import settings


def create_access_token(
    user_id: str,
    role: str,
    cohort_id: Optional[str] = None,
    cohort_expires_at: Optional[datetime] = None,
    expires_delta: Optional[timedelta] = None,
) -> tuple[str, str, datetime]:
    """
    Generate JWT access token valid for the shorter of:
    1. standard token duration (default 12 hours), or
    2. cohort's remaining time until expires_at.
    Returns (token_string, token_jti, token_expires_at).
    """
    now = datetime.now(timezone.utc)
    jti = str(uuid.uuid4())

    if expires_delta:
        token_expires_at = now + expires_delta
    else:
        token_expires_at = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    # Tie expiration to cohort window if earlier
    if cohort_expires_at is not None:
        if cohort_expires_at.tzinfo is None:
            cohort_expires_at = cohort_expires_at.replace(tzinfo=timezone.utc)
        if cohort_expires_at < token_expires_at:
            token_expires_at = cohort_expires_at

    payload: Dict[str, Any] = {
        "sub": user_id,
        "role": role,
        "cohort_id": cohort_id,
        "cohort_expires_at": cohort_expires_at.isoformat() if cohort_expires_at else None,
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(token_expires_at.timestamp()),
    }

    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return token, jti, token_expires_at


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate JWT access token signature and expiration."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except (jwt.PyJWTError, Exception):
        return None
