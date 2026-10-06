from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.models import AuthSession, User
from backend.app.db.session import get_db
from backend.app.schemas.auth import LoginResponse, PasscodeLoginRequest, UserResponse
from backend.app.security.deps import get_current_user, security
from backend.app.security.passcodes import hash_token
from backend.app.services.access_service import AccessService

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: PasscodeLoginRequest, request: Request, db: AsyncSession = Depends(get_db)
):
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    elif request.client:
        ip = request.client.host
    else:
        ip = "127.0.0.1"
    user_agent = request.headers.get("User-Agent")

    result = await AccessService.authenticate_passcode(
        db=db,
        passcode_plain=payload.passcode,
        display_name=payload.display_name,
        ip=ip,
        user_agent=user_agent,
    )
    return result


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    token = credentials.credentials
    t_hash = hash_token(token)
    now = datetime.now(timezone.utc)

    stmt = (
        update(AuthSession)
        .where(and_(AuthSession.token_hash == t_hash, AuthSession.user_id == current_user.id))
        .values(revoked_at=now)
    )
    await db.execute(stmt)
    await db.commit()
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    return UserResponse(
        id=current_user.id,
        display_name=current_user.display_name,
        role=current_user.role,
        cohort_id=current_user.cohort_id,
        email=current_user.email,
    )
