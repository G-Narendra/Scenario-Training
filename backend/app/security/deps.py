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


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)

    auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not payload:
        raise auth_error

    user_id = payload.get("sub")
    if not user_id:
        raise auth_error

    # Verify session token hash in DB and ensure not revoked
    t_hash = hash_token(token)
    session_stmt = select(AuthSession).where(
        and_(AuthSession.token_hash == t_hash, AuthSession.revoked_at.is_(None))
    )
    auth_sess = (await db.execute(session_stmt)).scalar_one_or_none()
    if not auth_sess:
        raise auth_error

    now = datetime.now(timezone.utc)
    sess_expires_at = auth_sess.expires_at
    if sess_expires_at.tzinfo is None:
        sess_expires_at = sess_expires_at.replace(tzinfo=timezone.utc)
    if now > sess_expires_at:
        raise auth_error

    # Fetch user
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise auth_error

    # Enforce hard 30-day cohort window check at API layer
    if user.cohort_id:
        cohort = await db.get(Cohort, user.cohort_id)
        if not cohort or not cohort.is_active:
            raise auth_error
        cohort_expires_at = cohort.expires_at
        if cohort_expires_at.tzinfo is None:
            cohort_expires_at = cohort_expires_at.replace(tzinfo=timezone.utc)
        if now > cohort_expires_at:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Cohort access window has expired."
            )

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
