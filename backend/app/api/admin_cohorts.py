from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
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
from backend.app.schemas.progress import CohortProgressResponse
from backend.app.security.deps import require_group_admin
from backend.app.services.access_service import AccessService
from backend.app.services.progress_service import ProgressService

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


@router.get("/{id}/progress", response_model=CohortProgressResponse)
async def get_cohort_progress(
    id: str,
    current_admin: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve aggregate performance and completion analytics for a cohort."""
    # Enforce multi-tenant privacy: group admins can only view their own assigned cohort
    if current_admin.role != "super_admin" and current_admin.cohort_id != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot access progress metrics for another cohort",
        )

    try:
        return await ProgressService.get_cohort_progress(db=db, cohort_id=id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{id}/export.csv")
async def export_cohort_csv(
    id: str,
    current_admin: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    """Export all session results and evaluation metrics for a cohort as CSV."""
    if current_admin.role != "super_admin" and current_admin.cohort_id != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot export data for another cohort",
        )

    try:
        csv_data = await ProgressService.export_cohort_csv(db=db, cohort_id=id)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="cohort_{id}_progress.csv"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
