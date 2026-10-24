from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import and_, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.models import AttemptLedger, Cohort, User
from backend.app.db.session import get_db
from backend.app.schemas.cohorts import (
    AddCohortMemberRequest,
    BulkAddMembersRequest,
    CohortMemberResponse,
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
        custom_passcode=payload.custom_passcode,
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


@router.get("/{id}/members", response_model=List[CohortMemberResponse])
async def list_cohort_members(
    id: str,
    current_admin: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all enrolled students/members in a cohort."""
    if current_admin.role != "super_admin" and current_admin.cohort_id != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot view members of another cohort",
        )

    stmt = select(User).where(User.cohort_id == id).order_by(User.display_name.asc())
    members = (await db.execute(stmt)).scalars().all()
    return [
        CohortMemberResponse(
            id=m.id,
            cohort_id=m.cohort_id,
            display_name=m.display_name,
            role=m.role,
            is_active=m.is_active,
            last_login_at=m.last_login_at,
            created_at=m.created_at,
        )
        for m in members
    ]


@router.post("/{id}/members", response_model=CohortMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_cohort_member(
    id: str,
    payload: AddCohortMemberRequest,
    current_admin: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    """Enroll a new student/trainee into a cohort's roster."""
    if current_admin.role != "super_admin" and current_admin.cohort_id != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot modify members of another cohort",
        )

    cohort = await db.get(Cohort, id)
    if not cohort:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cohort not found")

    clean_name = payload.display_name.strip()
    if not clean_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Display name cannot be empty")

    stmt = select(User).where(and_(User.cohort_id == id, func.lower(User.display_name) == clean_name.lower()))
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student '{clean_name}' is already enrolled in this cohort.",
        )

    new_user = User(
        cohort_id=id,
        display_name=clean_name,
        role=payload.role,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return CohortMemberResponse(
        id=new_user.id,
        cohort_id=new_user.cohort_id,
        display_name=new_user.display_name,
        role=new_user.role,
        is_active=new_user.is_active,
        last_login_at=new_user.last_login_at,
        created_at=new_user.created_at,
    )


@router.post("/{id}/members/bulk", response_model=List[CohortMemberResponse], status_code=status.HTTP_201_CREATED)
async def bulk_add_cohort_members(
    id: str,
    payload: BulkAddMembersRequest,
    current_admin: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    """Bulk enroll multiple students into a cohort at once from a list of names."""
    if current_admin.role != "super_admin" and current_admin.cohort_id != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot modify members of another cohort",
        )

    cohort = await db.get(Cohort, id)
    if not cohort:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cohort not found")

    # Fetch existing members to prevent duplicates
    existing_stmt = select(User).where(User.cohort_id == id)
    existing_members = (await db.execute(existing_stmt)).scalars().all()
    existing_names_lower = {m.display_name.strip().lower() for m in existing_members}

    added_members: List[User] = []
    for raw_name in payload.names:
        clean = raw_name.strip()
        if not clean or len(clean) < 2 or clean.lower() in existing_names_lower:
            continue

        new_user = User(
            cohort_id=id,
            display_name=clean,
            role=payload.role,
            is_active=True,
        )
        db.add(new_user)
        existing_names_lower.add(clean.lower())
        added_members.append(new_user)

    if added_members:
        await db.commit()
        for u in added_members:
            await db.refresh(u)

    return [
        CohortMemberResponse(
            id=u.id,
            cohort_id=u.cohort_id,
            display_name=u.display_name,
            role=u.role,
            is_active=u.is_active,
            last_login_at=u.last_login_at,
            created_at=u.created_at,
        )
        for u in added_members
    ]


@router.delete("/{id}")
async def delete_cohort(
    id: str,
    request: Request,
    current_admin: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete a cohort and safely clean up related access credentials."""
    if current_admin.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only super administrators can permanently delete cohorts.",
        )
    ip = request.client.host if request.client else "127.0.0.1"
    await AccessService.delete_cohort(
        db=db, cohort_id=id, actor_id=current_admin.id, ip=ip
    )
    return {"message": "Cohort permanently deleted successfully."}


@router.delete("/{id}/members/{user_id}")
async def remove_cohort_member(
    id: str,
    user_id: str,
    current_admin: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    """Remove a student/trainee from the cohort roster and revoke logins."""
    if current_admin.role != "super_admin" and current_admin.cohort_id != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot modify members of another cohort",
        )

    stmt = select(User).where(and_(User.cohort_id == id, User.id == user_id))
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in cohort")

    # Safety: Cannot remove primary administrators
    if user.display_name.lower() in ("narendra", "uzair"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove primary administrator accounts (Narendra / Uzair).",
        )

    # Clean up attempt ledger entries for this student
    await db.execute(
        delete(AttemptLedger).where(
            and_(
                AttemptLedger.cohort_id == id,
                (AttemptLedger.user_id == user_id) | (AttemptLedger.student_name == user.display_name),
            )
        )
    )

    await db.delete(user)
    await db.commit()
    return {"message": f"Successfully removed '{user.display_name}' from the cohort."}


@router.post("/{id}/members/{user_id}/reset-attempts")
async def reset_cohort_member_attempts(
    id: str,
    user_id: str,
    request: Request,
    current_admin: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    """Reset all scenario attempts back to 0 for a student/trainee in a cohort."""
    if current_admin.role != "super_admin" and current_admin.cohort_id != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot modify members of another cohort",
        )
    ip = request.client.host if request.client else "127.0.0.1"
    count = await AccessService.reset_member_attempts(
        db=db, cohort_id=id, user_id=user_id, actor_id=current_admin.id, ip=ip
    )
    return {"message": f"Successfully reset {count} attempt records for member."}


