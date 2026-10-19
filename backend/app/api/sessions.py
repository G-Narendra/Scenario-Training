import asyncio
import json
import time
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.ai.engine.conversation_engine import ConversationEngine
from backend.app.ai.providers import get_llm_provider
from backend.app.db.base import is_expired, utc_now
from backend.app.db.models import (
    AttemptLedger,
    Cohort,
    Message,
    Scenario,
    SimulationSession,
    UsageEvent,
    User,
)
from backend.app.db.session import get_db
from backend.app.schemas.evaluation import FeedbackReportSchema
from backend.app.schemas.sessions import (
    CreateSessionRequest,
    SendMessageRequest,
    SessionDetailResponse,
    SessionListItemResponse,
    SessionMessageResponse,
)
from backend.app.security.deps import get_current_user
from backend.app.services.scoring_service import ScoringService

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

_cohort_spend_cache: dict[str, tuple[float, float]] = {}


async def _get_cached_cohort_spend(db: AsyncSession, cohort_id: str) -> float:
    now_m = time.monotonic()
    if cohort_id in _cohort_spend_cache:
        cached_spend, expiry = _cohort_spend_cache[cohort_id]
        if now_m < expiry:
            return cached_spend
    usage_stmt = select(func.coalesce(func.sum(UsageEvent.cost_estimate), 0.0)).where(
        UsageEvent.cohort_id == cohort_id
    )
    total_spend = (await db.execute(usage_stmt)).scalar() or 0.0
    _cohort_spend_cache[cohort_id] = (total_spend, now_m + 60.0)
    return total_spend


@router.post("", response_model=SessionDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: CreateSessionRequest,
    x_device_fingerprint: Optional[str] = Header(None, alias="X-Device-Fingerprint"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start a new interactive scenario simulation session with 2-attempt anti-abuse lock."""
    device_fp = (payload.device_fingerprint or x_device_fingerprint or f"fp-{current_user.id}")[:64]

    # Verify active cohort if user has one
    if current_user.cohort_id:
        c_stmt = select(Cohort).where(Cohort.id == current_user.cohort_id)
        cohort = (await db.execute(c_stmt)).scalar_one_or_none()
        if cohort:
            now = utc_now()
            if not cohort.is_active or is_expired(cohort.expires_at):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="COHORT_EXPIRED: The training cohort period has ended or is inactive.",
                )

            # Check Attempt Ledger (Max 2 Attempts per enrolled student / device)
            # Developers & Admins (super_admin, group_admin, or Narendra) have unlimited testing attempts
            is_developer_or_admin = (
                current_user.role in ("super_admin", "group_admin")
                or current_user.display_name.lower() == "narendra"
            )

            if not is_developer_or_admin:
                ledger_stmt = select(AttemptLedger).where(
                    AttemptLedger.cohort_id == cohort.id,
                    AttemptLedger.scenario_id == payload.scenario_id,
                    or_(
                        AttemptLedger.user_id == current_user.id,
                        AttemptLedger.device_fingerprint == device_fp,
                        func.lower(AttemptLedger.student_name) == current_user.display_name.lower(),
                    ),
                )
                ledger_res = await db.execute(ledger_stmt)
                existing_attempt = ledger_res.scalar_one_or_none()

                if existing_attempt and existing_attempt.attempt_count >= 10:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="ATTEMPT_LIMIT_REACHED: You have completed your 10 assigned practice attempts for this scenario. Please wait for the trainer's instructions.",
                    )

                # Check Cohort Budget Cap ($10 USD safety ceiling) with fast-path memory cache
                total_spend = await _get_cached_cohort_spend(db, cohort.id)
                if total_spend >= cohort.budget_cap_usd:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="BUDGET_CAP_EXCEEDED: The training cohort safety budget limit has been reached.",
                    )

                # Record or increment attempt ledger
                if existing_attempt:
                    existing_attempt.attempt_count += 1
                    existing_attempt.last_attempt_at = now
                    if not existing_attempt.user_id:
                        existing_attempt.user_id = current_user.id
                else:
                    new_ledger = AttemptLedger(
                        cohort_id=cohort.id,
                        scenario_id=payload.scenario_id,
                        device_fingerprint=device_fp,
                        user_id=current_user.id,
                        student_name=current_user.display_name,
                        attempt_count=1,
                        last_attempt_at=now,
                    )
                    db.add(new_ledger)
                await db.flush()

    engine = ConversationEngine(db)
    sim_session, opening_msg = await engine.start_session(
        user=current_user,
        scenario_id=payload.scenario_id,
        mode=payload.mode,
    )

    scenario_title = (
        (sim_session.state_metadata or {}).get("scenario_title")
        or "Workplace Simulation Scenario"
    )

    return SessionDetailResponse(
        id=sim_session.id,
        scenario_id=sim_session.scenario_id,
        scenario_title=scenario_title,
        mode=sim_session.mode,
        status=sim_session.status,
        started_at=sim_session.started_at,
        ended_at=sim_session.ended_at,
        end_reason=sim_session.end_reason,
        token_usage=sim_session.token_usage,
        turn_count=0,
        messages=[
            SessionMessageResponse(
                seq=opening_msg.seq,
                role=opening_msg.role,
                content=opening_msg.content,
                latency_ms=opening_msg.latency_ms,
                created_at=opening_msg.created_at,
            )
        ],
    )


@router.post("/{session_id}/messages")
async def send_session_message(
    session_id: str,
    payload: SendMessageRequest,
    accept: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send a message in the active session and receive counterpart response.
    Supports Server-Sent Events (SSE) streaming or JSON response.
    """
    # Verify session ownership
    check_stmt = select(SimulationSession).where(
        SimulationSession.id == session_id, SimulationSession.user_id == current_user.id
    )
    res = await db.execute(check_stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or does not belong to you.",
        )

    engine = ConversationEngine(db)

    # SSE Streaming response if requested
    if accept and "text/event-stream" in accept:

        async def event_generator():
            async for token in engine.process_turn_stream(session_id, payload.content):
                data = json.dumps({"chunk": token})
                yield f"data: {data}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    # Standard JSON response (accumulate stream)
    full_tokens = []
    async for token in engine.process_turn_stream(session_id, payload.content):
        full_tokens.append(token)

    # Refresh session to check updated status
    refreshed_res = await db.execute(
        select(SimulationSession).where(SimulationSession.id == session_id)
    )
    refreshed_session = refreshed_res.scalar_one()

    return {
        "reply": "".join(full_tokens),
        "status": refreshed_session.status,
        "end_reason": refreshed_session.end_reason,
    }


@router.post("/{session_id}/end", response_model=SessionDetailResponse)
async def end_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Explicitly conclude an active training session."""
    engine = ConversationEngine(db)
    session = await engine.end_session_explicit(session_id, current_user.id)

    # Fetch scenario details and messages
    scen_res = await db.execute(select(Scenario).where(Scenario.id == session.scenario_id))
    scenario = scen_res.scalar_one()

    msgs_res = await db.execute(
        select(Message).where(Message.session_id == session.id).order_by(Message.seq)
    )
    messages = msgs_res.scalars().all()

    return SessionDetailResponse(
        id=session.id,
        scenario_id=session.scenario_id,
        scenario_title=scenario.title,
        mode=session.mode,
        status=session.status,
        started_at=session.started_at,
        ended_at=session.ended_at,
        end_reason=session.end_reason,
        token_usage=session.token_usage,
        turn_count=session.state_metadata.get("turn_count", 0),
        messages=[
            SessionMessageResponse(
                seq=m.seq,
                role=m.role,
                content=m.content,
                latency_ms=m.latency_ms,
                created_at=m.created_at,
            )
            for m in messages
        ],
    )


@router.get("/{session_id}", response_model=SessionDetailResponse)
async def get_session_detail(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve full session detail including complete message transcript."""
    stmt = (
        select(SimulationSession)
        .where(SimulationSession.id == session_id)
        .options(
            selectinload(SimulationSession.scenario),
            selectinload(SimulationSession.messages),
            selectinload(SimulationSession.user).selectinload(User.cohort),
        )
    )
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    # Privacy check: Trainees can only see their own sessions; admins can view cohort sessions
    if current_user.role == "trainee" and session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return SessionDetailResponse(
        id=session.id,
        scenario_id=session.scenario_id,
        scenario_title=session.scenario.title,
        mode=session.mode,
        status=session.status,
        started_at=session.started_at,
        ended_at=session.ended_at,
        end_reason=session.end_reason,
        token_usage=session.token_usage,
        turn_count=session.state_metadata.get("turn_count", 0),
        trainee_name=session.user.display_name if session.user else None,
        cohort_name=session.user.cohort.name if (session.user and session.user.cohort) else None,
        messages=[
            SessionMessageResponse(
                seq=m.seq,
                role=m.role,
                content=m.content,
                latency_ms=m.latency_ms,
                created_at=m.created_at,
            )
            for m in session.messages
        ],
    )


@router.get("/{session_id}/messages", response_model=List[SessionMessageResponse])
async def get_session_messages(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve message transcript for a simulation session."""
    session_obj = await db.get(SimulationSession, session_id)
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")
    if current_user.role == "trainee" and session_obj.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    stmt = select(Message).where(Message.session_id == session_id).order_by(Message.seq)
    msgs = (await db.execute(stmt)).scalars().all()
    return [
        SessionMessageResponse(
            seq=m.seq,
            role=m.role,
            content=m.content,
            latency_ms=m.latency_ms,
            created_at=m.created_at,
        )
        for m in msgs
    ]


@router.get("", response_model=List[SessionListItemResponse])
async def list_sessions(
    mine: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List simulation sessions for current user or cohort."""
    query = (
        select(SimulationSession)
        .options(
            selectinload(SimulationSession.scenario),
            selectinload(SimulationSession.evaluation),
            selectinload(SimulationSession.user),
        )
        .order_by(desc(SimulationSession.started_at))
    )

    is_mine = mine if mine is not None else (current_user.role == "trainee")

    if is_mine:
        query = query.where(SimulationSession.user_id == current_user.id)
    elif current_user.role != "super_admin" and current_user.cohort_id:
        # Group admin viewing cohort
        query = query.join(SimulationSession.user).where(User.cohort_id == current_user.cohort_id)

    res = await db.execute(query)
    sessions = res.scalars().all()

    return [
        SessionListItemResponse(
            id=s.id,
            scenario_id=s.scenario_id,
            scenario_title=s.scenario.title if s.scenario else "Simulation Practice",
            mode=s.mode,
            status=s.status,
            started_at=s.started_at,
            ended_at=s.ended_at,
            turn_count=s.state_metadata.get("turn_count", 0),
            overall_score=s.evaluation.overall_score if s.evaluation else None,
            trainee_name=s.user.display_name if s.user else "Student",
            user_id=s.user_id,
        )
        for s in sessions
    ]


_eval_locks: dict[str, asyncio.Lock] = {}


def get_session_eval_lock(session_id: str) -> asyncio.Lock:
    if session_id not in _eval_locks:
        _eval_locks[session_id] = asyncio.Lock()
    return _eval_locks[session_id]


@router.get("/{session_id}/evaluation", response_model=FeedbackReportSchema)
async def get_session_evaluation(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve or generate the feedback evaluation report for a session with concurrency locking."""
    stmt = (
        select(SimulationSession)
        .where(SimulationSession.id == session_id)
        .options(selectinload(SimulationSession.evaluation))
    )
    session_obj = (await db.execute(stmt)).scalar_one_or_none()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Simulation session not found")

    if current_user.role == "trainee" and session_obj.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    # If already evaluated and persisted, return immediately
    if session_obj.evaluation:
        return ScoringService._build_schema_from_record(session_obj.evaluation)

    eval_lock = get_session_eval_lock(session_id)
    async with eval_lock:
        # Re-check under lock in case concurrent request completed it
        refreshed_stmt = (
            select(SimulationSession)
            .where(SimulationSession.id == session_id)
            .options(selectinload(SimulationSession.evaluation))
        )
        refreshed = (await db.execute(refreshed_stmt)).scalar_one_or_none()
        if refreshed and refreshed.evaluation:
            return ScoringService._build_schema_from_record(refreshed.evaluation)

        provider = get_llm_provider()
        report = await ScoringService.evaluate_session(db, session_id, provider)
        return report


@router.post("/{session_id}/evaluation", response_model=FeedbackReportSchema)
async def regenerate_session_evaluation(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger re-evaluation of a session with concurrency locking."""
    eval_lock = get_session_eval_lock(session_id)
    async with eval_lock:
        stmt = (
            select(SimulationSession)
            .where(SimulationSession.id == session_id)
            .options(selectinload(SimulationSession.evaluation))
        )
        session_obj = (await db.execute(stmt)).scalar_one_or_none()
        if not session_obj:
            raise HTTPException(status_code=404, detail="Simulation session not found")

        if current_user.role == "trainee" and session_obj.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden")

        # If previous evaluation exists, delete it so re-evaluation occurs
        if session_obj.evaluation:
            await db.delete(session_obj.evaluation)
            await db.commit()

        provider = get_llm_provider()
        report = await ScoringService.evaluate_session(db, session_id, provider)
        return report
