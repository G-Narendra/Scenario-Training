import time
from datetime import datetime, timezone
from typing import List

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.models import AuthSession, Cohort, User
from backend.app.db.session import get_db
from backend.app.security.passcodes import hash_token
from backend.app.security.tokens import decode_access_token

security = HTTPBearer(auto_error=True)

_token_cache: dict[str, tuple[User, float]] = {}


def invalidate_token_cache(t_hash: str):
    _token_cache.pop(t_hash, None)


def invalidate_all_user_tokens(user_id: str):
    """Evicts all cached tokens for a specific user ID."""
    keys_to_remove = [k for k, (u, _) in _token_cache.items() if getattr(u, "id", None) == user_id]
    for k in keys_to_remove:
        _token_cache.pop(k, None)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    t_hash = hash_token(token)
    now_m = time.monotonic()

    auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Fast-path cache: avoids 3 sequential DB queries per request across concurrent tabs
    if t_hash in _token_cache:
        cached_user, expiry = _token_cache[t_hash]
        if now_m < expiry:
            if not cached_user.is_active:
                _token_cache.pop(t_hash, None)
                raise auth_error
            return cached_user

    payload = decode_access_token(token)

    if not payload:
        raise auth_error

    user_id = payload.get("sub")
    if not user_id:
        raise auth_error

    # Check for explicit session revocation if recorded
    revocation_stmt = select(AuthSession).where(
        and_(AuthSession.token_hash == t_hash, AuthSession.revoked_at.is_not(None))
    )
    revoked_sess = (await db.execute(revocation_stmt)).scalar_one_or_none()
    if revoked_sess:
        _token_cache.pop(t_hash, None)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTH_TOKEN_REVOKED: This session has been revoked.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch user
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        _token_cache.pop(t_hash, None)
        raise auth_error

    # Enforce hard 30-day cohort window check at API layer for trainees only
    if user.cohort_id and user.role not in ("super_admin", "group_admin"):
        cohort = await db.get(Cohort, user.cohort_id)
        if not cohort or not cohort.is_active:
            raise auth_error
        now = datetime.now(timezone.utc)
        cohort_expires_at = cohort.expires_at
        if cohort_expires_at.tzinfo is None:
            cohort_expires_at = cohort_expires_at.replace(tzinfo=timezone.utc)
        if now > cohort_expires_at:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Cohort access window has expired."
            )

    _token_cache[t_hash] = (user, now_m + 1800.0)
    return user


def require_roles(allowed_roles: List[str]):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for role '{current_user.role}'.",
            )
        return current_user

    return role_checker


require_trainee = require_roles(["trainee", "group_admin", "super_admin"])
require_group_admin = require_roles(["group_admin", "super_admin"])
require_super_admin = require_roles(["super_admin"])
