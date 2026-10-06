from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.models import AuditLog, SimulationSession, UsageEvent, User
from backend.app.db.session import get_db
from backend.app.schemas.admin_analytics import (
    AuditLogItem,
    AuditLogsResponse,
    UsageSummaryResponse,
    UsageTypeBreakdown,
)
from backend.app.security.deps import require_group_admin

router = APIRouter(prefix="/api/admin", tags=["Admin Analytics & Observability"])


@router.get("/audit-logs", response_model=AuditLogsResponse)
async def list_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action name"),
    limit: int = Query(50, ge=1, le=200),
    current_admin: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve security and administrative audit log entries."""
    query = select(AuditLog)
    if action:
        query = query.where(AuditLog.action == action)
    query = query.order_by(AuditLog.created_at.desc()).limit(limit)

    results = (await db.execute(query)).scalars().all()

    # Total count
    count_query = select(func.count(AuditLog.id))
    if action:
        count_query = count_query.where(AuditLog.action == action)
    total = (await db.execute(count_query)).scalar() or 0

    return AuditLogsResponse(
        items=[
            AuditLogItem(
                id=log.id,
                actor_id=log.actor_id,
                action=log.action,
                entity=log.entity,
                entity_id=log.entity_id,
                details=log.details,
                ip=log.ip,
                created_at=log.created_at,
            )
            for log in results
        ],
        total=total,
    )


@router.get("/usage", response_model=UsageSummaryResponse)
async def get_usage_summary(
    current_admin: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve aggregated token usage, audio duration, and estimated USD compute costs."""
    # Aggregated session stats
    sess_stmt = select(
        func.sum(SimulationSession.token_usage),
        func.sum(SimulationSession.audio_seconds),
        func.sum(SimulationSession.cost_estimate),
    )
    if current_admin.role != "super_admin" and current_admin.cohort_id:
        sess_stmt = sess_stmt.join(SimulationSession.user).where(
            User.cohort_id == current_admin.cohort_id
        )

    sess_res = (await db.execute(sess_stmt)).first()
    tot_tokens = int(sess_res[0] or 0) if sess_res else 0
    tot_audio_sec = float(sess_res[1] or 0.0) if sess_res else 0.0
    tot_cost = float(sess_res[2] or 0.0) if sess_res else 0.0

    # Query usage events
    events_query = select(
        UsageEvent.type,
        func.sum(UsageEvent.units),
        func.sum(UsageEvent.cost_estimate),
    ).group_by(UsageEvent.type)

    if current_admin.role != "super_admin" and current_admin.cohort_id:
        events_query = events_query.where(
            UsageEvent.cohort_id == current_admin.cohort_id
        )

    events_res = (await db.execute(events_query)).all()

    breakdowns = []
    for ev_type, units, cost in events_res:
        breakdowns.append(
            UsageTypeBreakdown(
                type=str(ev_type),
                total_units=int(units or 0),
                total_cost_usd=round(float(cost or 0.0), 4),
            )
        )

    # Count total events
    count_stmt = select(func.count(UsageEvent.id))
    if current_admin.role != "super_admin" and current_admin.cohort_id:
        count_stmt = count_stmt.where(UsageEvent.cohort_id == current_admin.cohort_id)
    event_count = (await db.execute(count_stmt)).scalar() or 0

    return UsageSummaryResponse(
        total_tokens=tot_tokens,
        total_audio_seconds=tot_audio_sec,
        total_cost_usd=round(tot_cost, 4),
        breakdown_by_type=breakdowns,
        recent_events_count=event_count,
    )
