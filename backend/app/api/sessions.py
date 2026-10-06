import json
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.ai.engine.conversation_engine import ConversationEngine
from backend.app.ai.providers import get_llm_provider
from backend.app.db.models import Message, Scenario, SimulationSession, User
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


@router.post("", response_model=SessionDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: CreateSessionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start a new interactive scenario simulation session."""
    engine = ConversationEngine(db)
    sim_session, opening_msg = await engine.start_session(
        user=current_user,
        scenario_id=payload.scenario_id,
        mode=payload.mode,
    )

    # Fetch scenario details for title
    scen_res = await db.execute(select(Scenario).where(Scenario.id == sim_session.scenario_id))
    scenario = scen_res.scalar_one()

    return SessionDetailResponse(
        id=sim_session.id,
        scenario_id=sim_session.scenario_id,
        scenario_title=scenario.title,
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
        )
        .order_by(desc(SimulationSession.started_at))
    )

    is_mine = mine if mine is not None else (current_user.role == "trainee")

    if is_mine:
        query = query.where(SimulationSession.user_id == current_user.id)
    elif current_user.cohort_id:
        # Group admin viewing cohort
        query = query.join(SimulationSession.user).where(User.cohort_id == current_user.cohort_id)

    res = await db.execute(query)
    sessions = res.scalars().all()

    return [
        SessionListItemResponse(
            id=s.id,
            scenario_id=s.scenario_id,
            scenario_title=s.scenario.title,
            mode=s.mode,
            status=s.status,
            started_at=s.started_at,
            ended_at=s.ended_at,
            turn_count=s.state_metadata.get("turn_count", 0),
            overall_score=s.evaluation.overall_score if s.evaluation else None,
        )
        for s in sessions
    ]


@router.get("/{session_id}/evaluation", response_model=FeedbackReportSchema)
async def get_session_evaluation(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve or generate the feedback evaluation report for a session."""
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

    provider = get_llm_provider()
    report = await ScoringService.evaluate_session(db, session_id, provider)
    return report


@router.post("/{session_id}/evaluation", response_model=FeedbackReportSchema)
async def regenerate_session_evaluation(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger re-evaluation of a session."""
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
