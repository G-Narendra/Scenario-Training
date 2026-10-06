import asyncio
import base64
import json
import logging
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.app.ai.engine.conversation_engine import ConversationEngine
from backend.app.ai.providers import get_llm_provider
from backend.app.db.models import SimulationSession, UsageEvent
from backend.app.db.session import async_session_factory
from backend.app.security.tokens import decode_access_token
from backend.app.voice.providers import get_voice_provider
from backend.app.voice.providers.base import VoiceConfig

logger = logging.getLogger(__name__)

router = APIRouter(tags=["voice"])


@router.websocket("/api/sessions/{session_id}/voice")
async def voice_websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    logger.info(f"Voice WebSocket connected for session {session_id}")

    voice_provider = get_voice_provider()
    active_stream_task: Optional[asyncio.Task] = None
    turn_start_time: Optional[float] = None
    current_user_id: Optional[str] = None
    cohort_id: Optional[str] = None

    try:
        # 1. Wait for session.start handshake with authentication
        init_data_raw = await websocket.receive_text()
        init_msg = json.loads(init_data_raw)

        if init_msg.get("type") != "session.start":
            await websocket.send_text(
                json.dumps(
                    {"type": "error", "message": "Expected session.start as initial message"}
                )
            )
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        token = init_msg.get("token") or websocket.query_params.get("token")
        if not token:
            await websocket.send_text(
                json.dumps({"type": "error", "message": "Missing authentication token"})
            )
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        try:
            claims = decode_access_token(token)
            if not claims or "sub" not in claims:
                raise ValueError("Invalid token claims")
            current_user_id = str(claims["sub"])
        except Exception:
            await websocket.send_text(
                json.dumps({"type": "error", "message": "Invalid or expired token"})
            )
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # 2. Load Session and Scenario configuration
        async with async_session_factory() as db:
            stmt = (
                select(SimulationSession)
                .where(SimulationSession.id == session_id)
                .options(
                    selectinload(SimulationSession.scenario), selectinload(SimulationSession.user)
                )
            )
            session_obj = (await db.execute(stmt)).scalar_one_or_none()
            if not session_obj:
                await websocket.send_text(
                    json.dumps({"type": "error", "message": "Session not found"})
                )
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return

            if session_obj.user_id != current_user_id:
                await websocket.send_text(json.dumps({"type": "error", "message": "Unauthorized"}))
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return

            if session_obj.status != "active":
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "error",
                            "message": f"Session is not active (status: {session_obj.status})",
                        }
                    )
                )
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return

            cohort_id = session_obj.user.cohort_id if session_obj.user else None
            persona = session_obj.scenario.persona or {}
            voice_config = VoiceConfig(
                voice_id="alloy",
                counterpart_name=persona.get("name", "Counterpart"),
                style_prompt=persona.get("communication_style", ""),
            )
            await voice_provider.initialize_session(voice_config)

        await websocket.send_text(
            json.dumps(
                {
                    "type": "session.ready",
                    "scenario_title": session_obj.scenario.title,
                    "persona_name": voice_config.counterpart_name,
                }
            )
        )

        # 3. Main Message Loop
        while True:
            raw_text = await websocket.receive_text()
            msg = json.loads(raw_text)
            msg_type = msg.get("type")

            if msg_type == "audio.chunk":
                chunk_b64 = msg.get("data", "")
                chunk_bytes = base64.b64decode(chunk_b64)
                partial = await voice_provider.process_incoming_audio(chunk_bytes)
                if partial:
                    await websocket.send_text(
                        json.dumps({"type": "transcript.partial", "text": partial})
                    )

            elif msg_type == "interrupt":
                # BARGE-IN: Trainee interrupted the counterpart!
                logger.info(f"Barge-in received for session {session_id}")
                await voice_provider.interrupt()
                if active_stream_task and not active_stream_task.done():
                    active_stream_task.cancel()
                await websocket.send_text(json.dumps({"type": "interrupted"}))

            elif msg_type == "audio.commit":
                # Trainee finished turn speaking
                turn_start_time = time.perf_counter()
                final_trainee_text = await voice_provider.finalize_trainee_turn()
                await websocket.send_text(
                    json.dumps({"type": "transcript.final", "text": final_trainee_text})
                )

                # Generate counterpart response through unified ConversationEngine
                async with async_session_factory() as db:
                    llm_provider = get_llm_provider()
                    engine = ConversationEngine(db=db, llm_provider=llm_provider)

                    # Get counterpart response text
                    reply_text = ""
                    async for chunk in engine.process_turn_stream(session_id, final_trainee_text):
                        reply_text += chunk

                await websocket.send_text(
                    json.dumps({"type": "assistant.text", "text": reply_text})
                )

                # Stream synthesized audio chunks
                first_byte_sent = False
                latency_ms = 0.0

                async def stream_audio_job():
                    nonlocal first_byte_sent, latency_ms
                    async for audio_chunk in voice_provider.generate_counterpart_speech(
                        reply_text, voice_config
                    ):
                        if not first_byte_sent:
                            first_byte_sent = True
                            if turn_start_time is not None:
                                latency_ms = (time.perf_counter() - turn_start_time) * 1000.0

                        await websocket.send_text(
                            json.dumps(
                                {
                                    "type": "assistant.audio",
                                    "data": audio_chunk.data_b64,
                                    "format": audio_chunk.format,
                                    "sample_rate": audio_chunk.sample_rate,
                                    "is_final": audio_chunk.is_final,
                                }
                            )
                        )

                    # Signal completion of assistant audio
                    await websocket.send_text(
                        json.dumps(
                            {
                                "type": "turn.complete",
                                "latency_ms": round(latency_ms, 2),
                            }
                        )
                    )

                active_stream_task = asyncio.create_task(stream_audio_job())

            elif msg_type == "session.end":
                # Conclude voice session
                async with async_session_factory() as db:
                    stmt = select(SimulationSession).where(SimulationSession.id == session_id)
                    s_obj = (await db.execute(stmt)).scalar_one_or_none()
                    if s_obj and s_obj.status == "active":
                        s_obj.status = "completed"
                        s_obj.ended_at = datetime.now(timezone.utc)
                        s_obj.end_reason = "user_ended"

                        # Record usage event
                        if cohort_id:
                            usage = UsageEvent(
                                user_id=current_user_id,
                                cohort_id=cohort_id,
                                session_id=session_id,
                                type="realtime",
                                units=60.0,  # 1 minute nominal
                                cost_estimate=0.06,
                            )
                            db.add(usage)
                        await db.commit()

                await websocket.send_text(
                    json.dumps({"type": "session.ended", "status": "completed"})
                )
                break

    except WebSocketDisconnect:
        logger.info(f"Voice WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"Voice WebSocket error: {e}", exc_info=True)
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except Exception:
            pass
    finally:
        if active_stream_task and not active_stream_task.done():
            active_stream_task.cancel()
        try:
            await websocket.close()
        except Exception:
            pass
