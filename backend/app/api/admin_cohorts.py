from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.models import Cohort, User
from backend.app.db.session import get_db
from backend.app.schemas.cohorts import (
    CohortResponse,
    CreateCohortRequest,
    ExtendCohortRequest,
    RotatePasscodeRequest,
    RotatePasscodeResponse,
)
from backend.app.security.deps import require_group_admin
from backend.app.services.access_service import AccessService

router = APIRouter(prefix="/api/admin/cohorts", tags=["Admin Cohorts"])


@router.post("", response_model=CohortResponse, status_code=status.HTTP_201_CREATED)
async def create_cohort(
    payload: CreateCohortRequest,
    request: Request,
    current_admin: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    ip = request.client.host if request.client else "127.0.0.1"
    cohort, plain_code = await AccessService.create_cohort(
        db=db,
        name=payload.name,
        description=payload.description,
        duration_days=payload.duration_days,
        track_access=payload.track_access,
        max_members=payload.max_members,
        budget_cap_usd=payload.budget_cap_usd,
        actor_id=current_admin.id,
        ip=ip,
    )
    return CohortResponse(
        id=cohort.id,
        name=cohort.name,
        description=cohort.description,
        starts_at=cohort.starts_at,
        expires_at=cohort.expires_at,
        is_active=cohort.is_active,
        max_members=cohort.max_members,
        budget_cap_usd=cohort.budget_cap_usd,
        track_access=cohort.track_access,
        initial_passcode=plain_code,
    )


@router.get("", response_model=List[CohortResponse])
async def list_cohorts(
    current_admin: User = Depends(require_group_admin), db: AsyncSession = Depends(get_db)
):
    stmt = select(Cohort).order_by(Cohort.created_at.desc())
    cohorts = (await db.execute(stmt)).scalars().all()
    return [
        CohortResponse(
            id=c.id,
            name=c.name,
            description=c.description,
            starts_at=c.starts_at,
            expires_at=c.expires_at,
            is_active=c.is_active,
            max_members=c.max_members,
            budget_cap_usd=c.budget_cap_usd,
            track_access=c.track_access,
            initial_passcode=None,
        )
        for c in cohorts
    ]


@router.get("/{id}", response_model=CohortResponse)
async def get_cohort(
    id: str, current_admin: User = Depends(require_group_admin), db: AsyncSession = Depends(get_db)
):
    cohort = await db.get(Cohort, id)
    if not cohort:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cohort not found")
    return CohortResponse(
        id=cohort.id,
        name=cohort.name,
        description=cohort.description,
        starts_at=cohort.starts_at,
        expires_at=cohort.expires_at,
        is_active=cohort.is_active,
        max_members=cohort.max_members,
        budget_cap_usd=cohort.budget_cap_usd,
        track_access=cohort.track_access,
        initial_passcode=None,
    )


@router.post("/{id}/passcodes/rotate", response_model=RotatePasscodeResponse)
async def rotate_passcode(
    id: str,
    payload: RotatePasscodeRequest,
    request: Request,
    current_admin: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    ip = request.client.host if request.client else "127.0.0.1"
    passcode, plain_code = await AccessService.rotate_passcode(
        db=db,
        cohort_id=id,
        label=payload.label,
        grace_period_minutes=payload.grace_period_minutes,
        actor_id=current_admin.id,
        ip=ip,
    )
    return RotatePasscodeResponse(
        cohort_id=id,
        new_passcode=plain_code,
        valid_until=passcode.valid_until,
        grace_period_minutes=payload.grace_period_minutes,
    )


@router.post("/{id}/extend", response_model=CohortResponse)
async def extend_cohort(
    id: str,
    payload: ExtendCohortRequest,
    request: Request,
    current_admin: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    ip = request.client.host if request.client else "127.0.0.1"
    cohort = await AccessService.extend_cohort(
        db=db,
        cohort_id=id,
        additional_days=payload.additional_days,
        actor_id=current_admin.id,
        ip=ip,
    )
    return CohortResponse(
        id=cohort.id,
        name=cohort.name,
        description=cohort.description,
        starts_at=cohort.starts_at,
        expires_at=cohort.expires_at,
        is_active=cohort.is_active,
        max_members=cohort.max_members,
        budget_cap_usd=cohort.budget_cap_usd,
        track_access=cohort.track_access,
        initial_passcode=None,
    )


@router.post("/{id}/revoke-sessions")
async def revoke_cohort_sessions(
    id: str,
    request: Request,
    current_admin: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    ip = request.client.host if request.client else "127.0.0.1"
    count = await AccessService.revoke_cohort_sessions(
        db=db, cohort_id=id, actor_id=current_admin.id, ip=ip
    )
    return {"message": f"Successfully revoked {count} active sessions for cohort."}
