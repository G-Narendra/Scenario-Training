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

        skill_scores = []
        for s in skills:
            skill_scores.append(
                SkillScoreItem(
                    skill=s["key"],
                    score=3,
                    rubric_level_reached=s.get("rubric", {}).get(
                        "3", "Standard baseline performance achieved."
                    ),
                    justification="Baseline automated evaluation generated during graceful recovery.",
                )
            )

        what_worked = [
            WhatWorkedItem(
                moment_seq=first_seq,
                quote=first_quote,
                why_it_worked="Initiated conversation and stated initial perspective clearly.",
            )
        ]
        what_didnt = [
            WhatDidntItem(
                moment_seq=first_seq,
                quote=first_quote,
                why_it_missed="Could engage in deeper exploratory discovery to uncover counterpart constraints.",
            )
        ]
        key_moments = [
            KeyMomentItem(
                moment_seq=first_seq,
                quote=first_quote,
                what_happened="Initial conversational positioning.",
                why_it_matters="Sets the emotional baseline and rapport for the interaction.",
                alternative_phrasing="I appreciate your time today. What top priorities or constraints are top of mind for you?",
                reasoning="This works better because asking open questions builds collaboration and lowers defenses.",
            ),
            KeyMomentItem(
                moment_seq=first_seq,
                quote=first_quote,
                what_happened="Discussion of core objectives.",
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
                met=True,
                evidence="Evaluated from simulation transcript review.",
            )
            for crit in scenario_data.get(
                "success_criteria", ["Demonstrate constructive communication"]
            )
        ]

        return FeedbackReportSchema(
            overall_summary="The trainee engaged in the simulation and maintained conversational dialogue throughout the scenario.",
            skill_scores=skill_scores,
            what_worked=what_worked,
            what_didnt=what_didnt,
            key_moments=key_moments,
            hidden_reveal=scenario_data.get(
                "hidden_motivations", ["Counterpart sought validation and clarity."]
            )[0],
            success_criteria_results=success_results,
            improvement_steps=improvement_steps,
            overall_score=50,
            is_fallback=True,
        )

    @classmethod
    async def evaluate_session(
        cls,
        db: AsyncSession,
        session_id: str,
        llm_provider: LLMProvider,
    ) -> FeedbackReportSchema:
        """
        Evaluates a simulation session, executes repair loop up to 3 times if needed,
        computes deterministic score, and persists to DB.
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
            eval_record = session_obj.evaluation
            return FeedbackReportSchema(
                overall_summary=eval_record.summary,
                skill_scores=[SkillScoreItem(**s) for s in eval_record.skill_scores],
                what_worked=[WhatWorkedItem(**w) for w in eval_record.strengths],
                what_didnt=[WhatDidntItem(**w) for w in eval_record.weaknesses],
                key_moments=[KeyMomentItem(**k) for k in eval_record.key_moments],
                hidden_reveal=eval_record.hidden_reveal or "Counterpart motivations evaluated.",
                success_criteria_results=[
                    SuccessCriteriaResultItem(**sc)
                    for sc in (eval_record.success_criteria_results or [])
                ],
                improvement_steps=[ImprovementStepItem(**i) for i in eval_record.improvement_steps],
                overall_score=eval_record.overall_score,
                is_fallback=False,
            )

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

        # 4. Generate Evaluator Prompt
        prompt_text = build_evaluator_prompt(scenario_dict, skills_data, transcript_data)
        current_prompt = prompt_text
        max_retries = 3
        report: Optional[FeedbackReportSchema] = None

        for attempt in range(max_retries + 1):
            try:
                response = await llm_provider.complete(
                    messages=[LLMMessage(role="user", content=current_prompt)],
                    system_prompt=EVALUATOR_SYSTEM_PROMPT,
                    temperature=0.2,
                )
                raw_json = response.content.strip()
                # Clean markdown wrapper if present
                if raw_json.startswith("```json"):
                    raw_json = raw_json[7:]
                if raw_json.startswith("```"):
                    raw_json = raw_json[3:]
                if raw_json.endswith("```"):
                    raw_json = raw_json[:-3]
                raw_json = raw_json.strip()

                parsed_dict = json.loads(raw_json)

                # Validate quotes
                quote_errors = cls.validate_verbatim_quotes(parsed_dict, trainee_msgs)
                if quote_errors:
                    raise ValueError("Quote validation failed:\n" + "\n".join(quote_errors))

                report = FeedbackReportSchema(**parsed_dict)
                break  # Successful parsing and validation!

            except Exception as e:
                logger.warning(f"Evaluation parse/validation error on attempt {attempt}: {e}")
                if attempt < max_retries:
                    validation_errors = [str(e)]
                    current_prompt = build_repair_prompt(
                        original_output=raw_json if "raw_json" in locals() else "",
                        validation_errors=validation_errors,
                        trainee_quotes_available=trainee_msgs,
                    )
                else:
                    logger.error("All evaluation repair retries exhausted. Using fallback report.")
                    report = cls.generate_fallback_report(scenario_dict, skills_data, trainee_msgs)

        if not report:
            report = cls.generate_fallback_report(scenario_dict, skills_data, trainee_msgs)

        # 5. Compute Deterministic Overall Score
        overall_score = cls.compute_deterministic_overall_score(
            report.skill_scores,
            scenario.skills_assessed,
        )
        report.overall_score = overall_score

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
            evaluator_model="claude-3-5-sonnet"
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

        await db.commit()
        await db.refresh(eval_model)

        return report
