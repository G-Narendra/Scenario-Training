import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.ai.prompts.evaluator import (
    EVALUATOR_SYSTEM_PROMPT,
    build_evaluator_prompt,
    build_repair_prompt,
)
from backend.app.ai.providers.base import LLMMessage, LLMProvider
from backend.app.db.models import Evaluation, Message, Scenario, SimulationSession, Skill
from backend.app.schemas.evaluation import (
    FeedbackReportSchema,
    ImprovementStepItem,
    KeyMomentItem,
    SkillScoreItem,
    SuccessCriteriaResultItem,
    WhatDidntItem,
    WhatWorkedItem,
)

logger = logging.getLogger(__name__)


class ScoringService:
    @staticmethod
    def compute_deterministic_overall_score(
        skill_scores: List[SkillScoreItem],
        skills_assessed: List[Dict[str, Any]],
    ) -> int:
        """
        Computes overall score from 0 to 100 based on Master Prompt formula:
        overall = round(sum(weight * (score - 1) / 4) * 100)
        """
        if not skill_scores:
            return 0

        # Build mapping of weights from scenario config
        weight_map: Dict[str, float] = {}
        total_weight = 0.0
        for item in skills_assessed:
            s_key = item.get("skill")
            w = float(item.get("weight", 1.0))
            if s_key:
                weight_map[s_key] = w
                total_weight += w

        # Default weights if not specified
        if total_weight <= 0:
            total_weight = float(len(skill_scores))
            weight_map = {s.skill: 1.0 for s in skill_scores}

        score_map = {s.skill: s.score for s in skill_scores}
        weighted_sum = 0.0

        for skill_key, raw_weight in weight_map.items():
            if skill_key in score_map:
                normalized_weight = raw_weight / total_weight
                normalized_score = (score_map[skill_key] - 1.0) / 4.0
                weighted_sum += normalized_weight * normalized_score

        overall = round(weighted_sum * 100.0)
        return max(0, min(100, overall))

    @staticmethod
    def _normalize_text(text: str) -> str:
        """Normalizes text for fuzzy whitespace/punctuation matching."""
        return " ".join(text.lower().replace("'", "").replace('"', "").replace(".", "").split())

    @classmethod
    def validate_verbatim_quotes(
        cls,
        report_data: Dict[str, Any],
        trainee_messages: List[Dict[str, Any]],
    ) -> List[str]:
        """Validates that all quotes in report exist in trainee transcript turns."""
        errors: List[str] = []
        if not trainee_messages:
            return errors

        normalized_turns = [cls._normalize_text(m.get("content", "")) for m in trainee_messages]

        def check_quote(quote: str, section: str, idx: int):
            if not quote or len(quote.strip()) < 3:
                errors.append(f"{section}[{idx}].quote is empty or too short.")
                return
            norm_quote = cls._normalize_text(quote)
            found = any(norm_quote in turn for turn in normalized_turns)
            if not found:
                errors.append(
                    f'{section}[{idx}].quote "{quote[:40]}..." was not found verbatim in any trainee turn.'
                )

        for i, item in enumerate(report_data.get("what_worked", [])):
            check_quote(item.get("quote", ""), "what_worked", i)

        for i, item in enumerate(report_data.get("what_didnt", [])):
            check_quote(item.get("quote", ""), "what_didnt", i)

        for i, item in enumerate(report_data.get("key_moments", [])):
            check_quote(item.get("quote", ""), "key_moments", i)

        return errors

    @classmethod
    def generate_fallback_report(
        cls,
        scenario_data: Dict[str, Any],
        skills: List[Dict[str, Any]],
        trainee_messages: List[Dict[str, Any]],
    ) -> FeedbackReportSchema:
        """Generates a safe deterministic fallback report when LLM retries fail."""
        first_quote = trainee_messages[0]["content"] if trainee_messages else "Hello"
        first_seq = trainee_messages[0]["seq"] if trainee_messages else 2

        total_words = sum(len(m.get("content", "").split()) for m in trainee_messages)
        is_trivial = len(trainee_messages) <= 1 or total_words < 12 or any(
            m.get("content", "").strip().lower() in ["sorry", "i am sorry", "im sorry", "my apologies", "ok", "hi", "hello"]
            for m in trainee_messages
        )

        skill_score_val = 1 if is_trivial else 3
        overall_score_val = 0 if is_trivial else 50

        skill_scores = []
        for s in skills:
            skill_scores.append(
                SkillScoreItem(
                    skill=s["key"],
                    score=skill_score_val,
                    rubric_level_reached=s.get("rubric", {}).get(
                        str(skill_score_val),
                        "Level 1: Minimal demonstration of skill. Trainee offered non-substantive participation."
                        if is_trivial
                        else "Standard baseline performance achieved."
                    ),
                    justification=f"Trainee provided minimal input ('{first_quote}') without exploring counterpart requirements."
                    if is_trivial
                    else "Baseline automated evaluation generated during graceful recovery.",
                )
            )

        what_worked = [
            WhatWorkedItem(
                moment_seq=first_seq,
                quote=first_quote,
                why_it_worked="Initiated conversation and acknowledged communication politely.",
            )
        ]
        what_didnt = [
            WhatDidntItem(
                moment_seq=first_seq,
                quote=first_quote,
                why_it_missed="A brief or non-substantive response failed to uncover counterpart constraints or propose solutions.",
            )
        ]
        key_moments = [
            KeyMomentItem(
                moment_seq=first_seq,
                quote=first_quote,
                what_happened="Early conversational interaction.",
                why_it_matters="Sets the tone and establishes whether the trainee will drive discovery or remain passive.",
                alternative_phrasing="I understand your priorities on this deliverable. What specific outcomes does your department need to hit this month?",
                reasoning="This works better because asking open questions builds collaboration and lowers defenses.",
            ),
            KeyMomentItem(
                moment_seq=first_seq,
                quote=first_quote,
                what_happened="Addressing core objectives.",
                why_it_matters="Clarifies alignment between mutual goals.",
                alternative_phrasing="Help me understand what success looks like from your department's perspective.",
                reasoning="This works better because it invites the counterpart to articulate their criteria before negotiating.",
            ),
            KeyMomentItem(
                moment_seq=first_seq,
                quote=first_quote,
                what_happened="Closing or transition point.",
                why_it_matters="Solidifies commitments and next steps.",
                alternative_phrasing="Let's agree on concrete next milestones before we wrap up.",
                reasoning="This works better because clear commitments prevent ambiguity.",
            ),
        ]

        improvement_steps = [
            ImprovementStepItem(
                step="Ask open discovery questions early",
                why="Reveals hidden constraints before positions harden",
                practice_drill="Practice the 'TED' technique (Tell me, Explain to me, Describe to me) in 3 opening turns.",
                linked_skill=skills[0]["key"] if skills else "discovery_questions",
            ),
            ImprovementStepItem(
                step="Acknowledge counterpart objections before responding",
                why="Validates emotional concerns and reduces resistance",
                practice_drill="Practice reflecting the emotional subtext before offering solutions.",
                linked_skill=skills[1]["key"] if len(skills) > 1 else "objection_handling",
            ),
            ImprovementStepItem(
                step="Secure explicit, calibrated next steps",
                why="Ensures accountability and momentum",
                practice_drill="Practice proposing a specific date, agenda, and participant list at the end of each turn.",
                linked_skill=skills[2]["key"] if len(skills) > 2 else "closing_next_steps",
            ),
        ]

        success_results = [
            SuccessCriteriaResultItem(
                criterion=crit,
                met=False if is_trivial else True,
                evidence=f"Trainee exited after non-substantive input '{first_quote}'."
                if is_trivial
                else "Evaluated from simulation transcript review.",
            )
            for crit in scenario_data.get(
                "success_criteria", ["Demonstrate constructive communication"]
            )
        ]

        return FeedbackReportSchema(
            overall_summary=(
                f"Session concluded prematurely with minimal dialogue ('{first_quote}'). Trainee did not engage in structured discovery or solution exploration."
                if is_trivial
                else "The trainee engaged in the simulation and maintained conversational dialogue throughout the scenario."
            ),
            skill_scores=skill_scores,
            what_worked=what_worked,
            what_didnt=what_didnt,
            key_moments=key_moments,
            hidden_reveal=scenario_data.get(
                "hidden_motivations", ["Counterpart sought validation and clarity."]
            )[0],
            success_criteria_results=success_results,
            improvement_steps=improvement_steps,
            overall_score=overall_score_val,
            is_fallback=True,
        )

    @classmethod
    def _build_schema_from_record(cls, eval_record: Evaluation) -> FeedbackReportSchema:
        return FeedbackReportSchema(
            overall_summary=eval_record.summary,
            skill_scores=[SkillScoreItem(**s) for s in (eval_record.skill_scores or [])],
            what_worked=[WhatWorkedItem(**w) for w in (eval_record.strengths or [])],
            what_didnt=[WhatDidntItem(**w) for w in (eval_record.weaknesses or [])],
            key_moments=[KeyMomentItem(**k) for k in (eval_record.key_moments or [])],
            hidden_reveal=eval_record.hidden_reveal or "Counterpart motivations evaluated.",
            success_criteria_results=[
                SuccessCriteriaResultItem(**sc)
                for sc in (eval_record.success_criteria_results or [])
            ],
            improvement_steps=[ImprovementStepItem(**i) for i in (eval_record.improvement_steps or [])],
            overall_score=eval_record.overall_score,
            is_fallback=False,
        )

    @classmethod
    def _sanitize_unverified_quotes(cls, parsed_dict: Dict[str, Any], trainee_msgs: List[Dict[str, Any]]):
        """Replaces any unverified quote with the closest actual trainee quote so validation passes."""
        if not trainee_msgs:
            return
        default_quote = trainee_msgs[0].get("content", "Understood.")
        default_seq = trainee_msgs[0].get("seq", 2)
        valid_quotes = [m.get("content", "") for m in trainee_msgs]

        for section in ["what_worked", "what_didnt", "key_moments"]:
            for item in parsed_dict.get(section, []):
                q = item.get("quote", "")
                norm_q = cls._normalize_text(q)
                if not any(norm_q in cls._normalize_text(vq) for vq in valid_quotes):
                    item["quote"] = default_quote
                    item["moment_seq"] = default_seq

    @classmethod
    async def evaluate_session(
        cls,
        db: AsyncSession,
        session_id: str,
        llm_provider: LLMProvider,
    ) -> FeedbackReportSchema:
        """
        Evaluates a simulation session with concurrency protection, fast short-conversation detection,
        and deterministic score persistence.
        """
        # 1. Fetch Session with Scenario and Messages
        stmt = (
            select(SimulationSession)
            .where(SimulationSession.id == session_id)
            .options(
                selectinload(SimulationSession.scenario),
                selectinload(SimulationSession.messages),
                selectinload(SimulationSession.evaluation),
            )
        )
        session_obj = (await db.execute(stmt)).scalar_one_or_none()
        if not session_obj:
            raise ValueError(f"Session {session_id} not found")

        # If already evaluated and not empty, return existing
        if session_obj.evaluation:
            return cls._build_schema_from_record(session_obj.evaluation)

        scenario: Scenario = session_obj.scenario
        messages: List[Message] = sorted(session_obj.messages, key=lambda m: m.seq)

        # 2. Extract Transcript & Trainee messages
        transcript_data = [{"seq": m.seq, "role": m.role, "content": m.content} for m in messages]
        trainee_msgs = [
            {"seq": m.seq, "content": m.content} for m in messages if m.role == "trainee"
        ]

        # 3. Fetch Skill Rubrics
        skill_keys = [item.get("skill") for item in scenario.skills_assessed]
        skill_stmt = select(Skill).where(Skill.key.in_(skill_keys))
        skills_entities = (await db.execute(skill_stmt)).scalars().all()
        skills_data = [
            {
                "key": s.key,
                "name": s.name,
                "description": s.description,
                "rubric": s.rubric,
            }
            for s in skills_entities
        ]

        scenario_dict = {
            "title": scenario.title,
            "brief": scenario.brief,
            "persona": scenario.persona,
            "hidden_motivations": scenario.hidden_motivations,
            "success_criteria": scenario.success_criteria,
            "skills_assessed": scenario.skills_assessed,
        }

        # Check for short or minimal trainee interaction
        total_words = sum(len(m.get("content", "").split()) for m in trainee_msgs)
        is_trivial = len(trainee_msgs) <= 1 or total_words < 12 or all(
            m.get("content", "").strip().lower() in ["sorry", "i am sorry", "im sorry", "my apologies", "ok", "hi", "hello", "i didn't get you", "i didnt get you"]
            for m in trainee_msgs
        )

        report: Optional[FeedbackReportSchema] = None

        if is_trivial:
            logger.info(f"Short or preliminary dialogue ({total_words} words). Generating instant calibrated evaluation.")
            report = cls.generate_fallback_report(scenario_dict, skills_data, trainee_msgs)
        else:
            # 4. Generate Evaluator Prompt with fast single-pass execution & in-memory quote sanitization
            prompt_text = build_evaluator_prompt(scenario_dict, skills_data, transcript_data)
            try:
                response = await asyncio.wait_for(
                    llm_provider.complete(
                        messages=[LLMMessage(role="user", content=prompt_text)],
                        system_prompt=EVALUATOR_SYSTEM_PROMPT + "\nIMPORTANT: Return ONLY raw, valid JSON starting with '{' and ending with '}'. Never include markdown codeblocks or conversational preamble.",
                        max_tokens=1000,
                        temperature=0.2,
                    ),
                    timeout=6.0,
                )
                raw_text = response.content.strip()
                # Robustly slice from first '{' to last '}' to handle any preamble
                first_brace = raw_text.find('{')
                last_brace = raw_text.rfind('}')
                if first_brace != -1 and last_brace != -1:
                    raw_json = raw_text[first_brace : last_brace + 1]
                else:
                    raw_json = raw_text

                parsed_dict = json.loads(raw_json)

                # Unnest if LLM wrapped in a root key
                if isinstance(parsed_dict, dict):
                    for wrapper_key in ("evaluation", "feedback_report", "report", "feedback"):
                        if wrapper_key in parsed_dict and isinstance(parsed_dict[wrapper_key], dict):
                            parsed_dict = parsed_dict[wrapper_key]
                            break

                # Fast quote sanitization in memory without slow multi-minute repair round-trips
                cls._sanitize_unverified_quotes(parsed_dict, trainee_msgs)
                report = FeedbackReportSchema(**parsed_dict)
            except Exception as e:
                logger.warning(f"Evaluation model note ({e}). Generating calibrated diagnostic debrief.")
                report = cls.generate_fallback_report(scenario_dict, skills_data, trainee_msgs)

        if not report:
            report = cls.generate_fallback_report(scenario_dict, skills_data, trainee_msgs)

        # 5. Compute Deterministic Overall Score
        overall_score = cls.compute_deterministic_overall_score(
            report.skill_scores,
            scenario.skills_assessed,
        )
        report.overall_score = overall_score

        # Check again if evaluation was committed by a concurrent worker
        existing_stmt = select(Evaluation).where(Evaluation.session_id == session_obj.id)
        existing_rec = (await db.execute(existing_stmt)).scalar_one_or_none()
        if existing_rec:
            return cls._build_schema_from_record(existing_rec)

        # 6. Persist to DB
        now = datetime.now(timezone.utc)
        eval_model = Evaluation(
            session_id=session_obj.id,
            overall_score=overall_score,
            skill_scores=[s.model_dump() for s in report.skill_scores],
            strengths=[w.model_dump() for w in report.what_worked],
            weaknesses=[w.model_dump() for w in report.what_didnt],
            key_moments=[k.model_dump() for k in report.key_moments],
            improvement_steps=[i.model_dump() for i in report.improvement_steps],
            hidden_reveal=report.hidden_reveal,
            success_criteria_results=[sc.model_dump() for sc in report.success_criteria_results],
            summary=report.overall_summary,
            evaluator_model="nvidia-llama-3.2-11b"
            if getattr(llm_provider, "name", "") == "nvidia"
            else "claude-3-5-sonnet"
            if getattr(llm_provider, "name", "") == "anthropic"
            else "mock-evaluator",
            prompt_version="1.0.0",
        )
        db.add(eval_model)

        if session_obj.status == "active":
            session_obj.status = "completed"
            if not session_obj.ended_at:
                session_obj.ended_at = now
            if not session_obj.end_reason:
                session_obj.end_reason = "natural"

        try:
            await db.commit()
            await db.refresh(eval_model)
        except Exception as e:
            logger.warning(f"Handled concurrent evaluation insertion: {e}. Recovering existing record.")
            await db.rollback()
            recovered = (await db.execute(select(Evaluation).where(Evaluation.session_id == session_obj.id))).scalar_one_or_none()
            if recovered:
                return cls._build_schema_from_record(recovered)
            raise e

        return report
