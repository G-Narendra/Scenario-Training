import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.ai.engine.conversation_engine import ConversationEngine
from backend.app.db.models import SimulationSession, User
from backend.app.db.session import get_db
from backend.app.security.deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["Chat"])


class ChatStreamRequest(BaseModel):
    session_id: str = Field(..., description="Active simulation session ID")
    content: str = Field(..., min_length=1, max_length=2000, description="Trainee message content")


@router.post("/stream")
async def stream_chat_turn(
    payload: ChatStreamRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Server-Sent Events (SSE) streaming endpoint for real-time interactive chat turns.
    Streams incremental response tokens with proper error recovery and completion termination.
    """
    stmt = select(SimulationSession).where(
        SimulationSession.id == payload.session_id,
        SimulationSession.user_id == current_user.id,
    )
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or does not belong to you.",
        )

    if session.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session is already closed with status '{session.status}'.",
        )

    engine = ConversationEngine(db)

    async def event_generator():
        try:
            async for token in engine.process_turn_stream(payload.session_id, payload.content):
                yield f"data: {json.dumps({'chunk': token})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            logger.error(f"SSE stream error: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
