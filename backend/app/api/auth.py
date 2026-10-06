from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import and_, delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.db.models import (
    AuditLog,
    AuthSession,
    SimulationSession,
    User,
)
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


@router.get("/me/export", status_code=status.HTTP_200_OK)
async def export_my_data(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """GDPR Article 20: Right to data portability - export all user training records."""
    stmt = (
        select(SimulationSession)
        .where(SimulationSession.user_id == current_user.id)
        .options(
            selectinload(SimulationSession.messages),
            selectinload(SimulationSession.evaluation),
        )
    )
    sessions = (await db.execute(stmt)).scalars().all()

    export_payload = {
        "user_profile": {
            "id": current_user.id,
            "display_name": current_user.display_name,
            "email": current_user.email,
            "role": current_user.role,
            "cohort_id": current_user.cohort_id,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
            "last_login_at": current_user.last_login_at.isoformat() if current_user.last_login_at else None,
        },
        "simulation_history": [
            {
                "session_id": s.id,
                "scenario_id": s.scenario_id,
                "mode": s.mode,
                "status": s.status,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "ended_at": s.ended_at.isoformat() if s.ended_at else None,
                "messages_count": len(s.messages),
                "evaluation": {
                    "overall_score": s.evaluation.overall_score,
                    "summary": s.evaluation.summary,
                    "strengths": s.evaluation.strengths,
                    "weaknesses": s.evaluation.weaknesses,
                } if s.evaluation else None,
            }
            for s in sessions
        ],
        "exported_at": datetime.now(timezone.utc).isoformat(),
    }
    return export_payload


@router.delete("/me", status_code=status.HTTP_200_OK)
async def delete_my_account(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """GDPR Article 17: Right to erasure - delete user sessions and anonymize identity."""
    ip = request.client.host if request.client else "127.0.0.1"

    # Revoke sessions
    await db.execute(delete(AuthSession).where(AuthSession.user_id == current_user.id))

    # Log audit entry before deletion
    audit = AuditLog(
        actor_id=current_user.id,
        action="USER_DATA_ERASURE",
        entity="User",
        entity_id=current_user.id,
        details={"reason": "User requested right to erasure / data deletion"},
        ip=ip,
    )
    db.add(audit)

    # Anonymize user record
    current_user.display_name = "Anonymized Trainee"
    current_user.email = None
    current_user.is_active = False

    await db.commit()
    return {"message": "User personal data successfully anonymized and session revoked."}
