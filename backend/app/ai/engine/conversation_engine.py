import time
from datetime import datetime, timezone
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.ai.engine.conclusion_detector import ConclusionDetector
from backend.app.ai.engine.curveballs import CurveballManager
from backend.app.ai.prompts.persona import PersonaPromptBuilder
from backend.app.ai.providers import get_llm_provider
from backend.app.ai.providers.base import LLMMessage, LLMProvider
from backend.app.db.models import Message, Scenario, SimulationSession, UsageEvent, User


class ConversationEngine:
    """Core conversation orchestrator managing turn flow, guardrails, limits, and streaming."""

    def __init__(self, db: AsyncSession, llm_provider: Optional[LLMProvider] = None):
        self.db = db
        self.llm_provider = llm_provider or get_llm_provider()

    async def start_session(
        self,
        user: User,
        scenario_id: str,
        mode: str = "text",
    ) -> Tuple[SimulationSession, Message]:
        """Initialize a new interactive scenario training session."""
        result = await self.db.execute(select(Scenario).where(Scenario.id == scenario_id))
        scenario = result.scalar_one_or_none()
        if not scenario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scenario with ID '{scenario_id}' not found.",
            )

        if scenario.status != "published":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot start session for an unpublished or archived scenario.",
            )

        now = datetime.now(timezone.utc)
        initial_metadata: Dict[str, Any] = {
            "emotional_state": scenario.persona.get("emotional_baseline", "guarded"),
            "revealed_motivations": [],
            "fired_curveballs": [],
            "turn_count": 0,
            "scenario_title": scenario.title,
            "scenario_difficulty": scenario.difficulty,
            "conclusion_signals": scenario.conclusion_signals,
            "duration_limit_seconds": scenario.duration_limit_seconds,
            "turn_limit": scenario.turn_limit,
        }

        sim_session = SimulationSession(
            user_id=user.id,
            scenario_id=scenario.id,
            scenario_version=scenario.version,
            mode=mode,
            status="active",
            started_at=now,
            state_metadata=initial_metadata,
        )
        self.db.add(sim_session)
        await self.db.flush()

        # Opening message from the counterpart character
        opening_msg = Message(
            session_id=sim_session.id,
            seq=1,
            role="counterpart",
            content=scenario.opening_line,
            latency_ms=0,
        )
        self.db.add(opening_msg)
        await self.db.commit()
        await self.db.refresh(sim_session)
        await self.db.refresh(opening_msg)

        return sim_session, opening_msg

    async def process_turn_stream(
        self,
        session_id: str,
        trainee_message: str,
    ) -> AsyncIterator[str]:
        """
        Process a trainee utterance, evaluate guardrails, stream counterpart reply,
        and handle turn limits or natural conclusion detection.
        """
        stmt = (
            select(SimulationSession)
            .where(SimulationSession.id == session_id)
            .options(
                selectinload(SimulationSession.messages),
                selectinload(SimulationSession.scenario),
                selectinload(SimulationSession.user),
            )
        )
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found.",
            )

        if session.status != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Session is already closed with status '{session.status}'.",
            )

        now = datetime.now(timezone.utc)
        meta = dict(session.state_metadata)
        started_at = session.started_at
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)
        elapsed_seconds = (now - started_at).total_seconds()

        # 1. Enforce time limit
        duration_limit = meta.get("duration_limit_seconds", 600)
        if elapsed_seconds > duration_limit:
            session.status = "timed_out"
            session.end_reason = "time_limit"
            session.ended_at = now
            await self.db.commit()
            yield "I have to run to another meeting now. We'll have to pick this up another time."
            return

        # 2. Enforce turn limit
        turn_count = meta.get("turn_count", 0) + 1
        turn_limit = meta.get("turn_limit", 30)
        if turn_count > turn_limit:
            session.status = "completed"
            session.end_reason = "turn_limit"
            session.ended_at = now
            await self.db.commit()
            yield "We've spent enough time discussing this today. Let's reconvene when there is something new."
            return

        meta["turn_count"] = turn_count

        # 3. Record trainee message
        existing_seq = len(session.messages)
        trainee_seq = existing_seq + 1
        t_msg = Message(
            session_id=session.id,
            seq=trainee_seq,
            role="trainee",
            content=trainee_message,
        )
        self.db.add(t_msg)
        await self.db.flush()

        # 4. Evaluate curveballs
        curveballs = session.scenario.curveballs or []
        fired_curveballs = list(meta.get("fired_curveballs", []))
        history_dicts = [{"role": m.role, "content": m.content} for m in session.messages]

        director_note, triggered_cb_id = CurveballManager.evaluate(
            curveball_definitions=curveballs,
            current_turn=turn_count,
            fired_curveballs=fired_curveballs,
            last_trainee_message=trainee_message,
            transcript_history=history_dicts,
        )
        if triggered_cb_id:
            fired_curveballs.append(triggered_cb_id)
            meta["fired_curveballs"] = fired_curveballs

        # 5. Emotional state & hidden motivation discovery tracking
        emotional_state = meta.get("emotional_state", "guarded")
        revealed_motivations = list(meta.get("revealed_motivations", []))
        msg_lower = trainee_message.lower()

        # Check for discovery / question asking
        if any(
            w in msg_lower
            for w in ["what", "how", "why", "priority", "objective", "help me understand"]
        ):
            if emotional_state == "guarded":
                emotional_state = "skeptical"
            elif emotional_state == "skeptical":
                emotional_state = "softening"

            # Check if trainee questions uncovered an unrevealed motivation
            hidden_motivations = session.scenario.hidden_motivations or []
            for h in hidden_motivations:
                if h not in revealed_motivations and ("cost" in h.lower() or "budget" in h.lower()):
                    if any(
                        kw in msg_lower
                        for kw in ["cost", "budget", "finance", "cfo", "pressure", "targets"]
                    ):
                        revealed_motivations.append(h)
        elif any(w in msg_lower for w in ["discount", "drop", "cheap", "must accept"]):
            # Stiffen resistance on aggressive premature pitching
            if emotional_state in ("softening", "guarded"):
                emotional_state = "defensive"

        meta["emotional_state"] = emotional_state
        meta["revealed_motivations"] = revealed_motivations
        session.state_metadata = meta

        # 6. Compose system prompt using PersonaPromptBuilder
        scenario_data = {
            "title": session.scenario.title,
            "brief": session.scenario.brief,
            "difficulty": session.scenario.difficulty,
            "persona": session.scenario.persona,
            "objections": session.scenario.objections,
            "hidden_motivations": session.scenario.hidden_motivations,
            "conclusion_signals": session.scenario.conclusion_signals,
        }

        system_prompt = PersonaPromptBuilder.build_system_prompt(
            scenario_data=scenario_data,
            current_emotional_state=emotional_state,
            revealed_motivations=revealed_motivations,
            director_note=director_note,
            mode=session.mode,
        )

        # 7. Prepare conversation messages (windowed for safety)
        llm_messages: List[LLMMessage] = []
        # Keep opening message + recent 14 turns to stay within token limits
        all_msgs = session.messages + [t_msg]
        for m in all_msgs[-16:]:
            role = "user" if m.role == "trainee" else "assistant"
            llm_messages.append(LLMMessage(role=role, content=m.content))

        # 8. Stream counterpart reply
        start_time = time.perf_counter()
        full_reply_parts = []
        async for chunk in self.llm_provider.stream_chat(llm_messages, system_prompt):
            full_reply_parts.append(chunk)
            yield chunk

        latency_ms = int((time.perf_counter() - start_time) * 1000)
        full_reply = "".join(full_reply_parts).strip()

        # 9. Record counterpart message
        counterpart_seq = trainee_seq + 1
        c_msg = Message(
            session_id=session.id,
            seq=counterpart_seq,
            role="counterpart",
            content=full_reply,
            latency_ms=latency_ms,
        )
        self.db.add(c_msg)

        # 10. Check for natural conclusion
        is_concluded, outcome, reason = ConclusionDetector.detect_heuristic(
            last_counterpart_message=full_reply,
            conclusion_signals=session.scenario.conclusion_signals,
        )
        if is_concluded:
            session.status = "completed"
            session.end_reason = "natural"
            session.ended_at = datetime.now(timezone.utc)
            meta["conclusion_outcome"] = outcome
            meta["conclusion_reason"] = reason

        # 11. Accounting & token tracking
        estimated_tokens = int((len(trainee_message.split()) + len(full_reply.split())) * 1.3)
        session.token_usage += estimated_tokens
        session.cost_estimate += (estimated_tokens / 1_000_000.0) * 5.0  # approximate cost

        if session.user and session.user.cohort_id:
            usage = UsageEvent(
                user_id=session.user_id,
                cohort_id=session.user.cohort_id,
                session_id=session.id,
                type="llm",
                units=estimated_tokens,
                cost_estimate=(estimated_tokens / 1_000_000.0) * 5.0,
            )
            self.db.add(usage)

        session.state_metadata = meta
        await self.db.commit()

    async def end_session_explicit(
        self,
        session_id: str,
        user_id: str,
    ) -> SimulationSession:
        """Explicit user-initiated conclusion of the simulation."""
        stmt = (
            select(SimulationSession)
            .where(SimulationSession.id == session_id, SimulationSession.user_id == user_id)
            .options(
                selectinload(SimulationSession.messages),
                selectinload(SimulationSession.scenario),
            )
        )
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found.",
            )

        if session.status == "active":
            session.status = "completed"
            session.end_reason = "user_ended"
            session.ended_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(session)

        return session
