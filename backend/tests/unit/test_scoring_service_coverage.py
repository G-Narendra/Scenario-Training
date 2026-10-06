from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.app.ai.providers.base import LLMResponse
from backend.app.db.models import Evaluation, Message, Scenario, SimulationSession, Skill
from backend.app.schemas.evaluation import SkillScoreItem
from backend.app.services.scoring_service import ScoringService


def test_scoring_service_fallback_generation():
    """Directly test fallback report generation to ensure valid schema."""
    scenario_data = {
        "title": "Fallback Scenario",
        "brief": "Brief text",
        "persona": {"name": "Bob", "role": "Manager"},
        "hidden_motivations": ["Secret driver"],
        "success_criteria": ["Criteria 1"],
    }
    skills = [
        {"key": "empathy", "name": "Empathy", "rubric": {"3": "Standard level 3"}},
        {"key": "clarity", "name": "Clarity", "rubric": {"3": "Standard level 3"}},
    ]
    trainee_messages = [
        {"seq": 2, "content": "Hello Bob, how are you today?"}
    ]

    report = ScoringService.generate_fallback_report(scenario_data, skills, trainee_messages)
    assert report.is_fallback is True
    assert len(report.improvement_steps) == 3
    assert len(report.key_moments) == 3
    assert report.what_worked[0].quote == "Hello Bob, how are you today?"


def test_scoring_service_weight_edge_cases():
    """Verify weight normalization when weights are empty or zero."""
    skills_assessed = []  # No weights provided
    scores = [
        SkillScoreItem(skill="skill_a", score=5, rubric_level_reached="L5", justification="Good"),
        SkillScoreItem(skill="skill_b", score=1, rubric_level_reached="L1", justification="Poor"),
    ]
    # (1.0 + 0.0) / 2 = 0.5 * 100 = 50
    overall = ScoringService.compute_deterministic_overall_score(scores, skills_assessed)
    assert overall == 50

    # Total weight zero edge case
    zero_weights = [{"skill": "skill_a", "weight": 0.0}]
    overall_zero = ScoringService.compute_deterministic_overall_score(scores, zero_weights)
    assert 0 <= overall_zero <= 100


def test_quote_validation_edge_cases():
    """Verify quote validator handles whitespace, punctuation, and empty input."""
    assert ScoringService.validate_verbatim_quotes({}, []) == []

    report = {
        "what_worked": [{"moment_seq": 1, "quote": ""}],
        "what_didnt": [{"moment_seq": 1, "quote": "hi"}],  # < 3 chars
    }
    errors = ScoringService.validate_verbatim_quotes(report, [{"seq": 1, "content": "valid quote"}])
    assert len(errors) == 2


@pytest.mark.asyncio
async def test_evaluate_session_not_found():
    """Ensure ValueError is raised if session ID does not exist."""
    db_mock = AsyncMock()
    exec_mock = MagicMock()
    exec_mock.scalar_one_or_none.return_value = None
    db_mock.execute.return_value = exec_mock

    provider_mock = AsyncMock()
    with pytest.raises(ValueError, match="Session non-existent not found"):
        await ScoringService.evaluate_session(db_mock, "non-existent", provider_mock)


@pytest.mark.asyncio
async def test_evaluate_session_existing_cached_eval():
    """Ensure existing evaluation is returned immediately without LLM call."""
    session_obj = SimulationSession(
        id="s123",
        user_id="u1",
        scenario_id="sc1",
        mode="text",
        status="completed",
    )
    eval_record = Evaluation(
        id="e1",
        session_id="s123",
        overall_score=88,
        skill_scores=[{"skill": "s1", "score": 4, "rubric_level_reached": "L4", "justification": "Good"}],
        strengths=[{"moment_seq": 1, "quote": "hi", "why_it_worked": "great"}],
        weaknesses=[{"moment_seq": 2, "quote": "no", "why_it_missed": "missed"}],
        key_moments=[
            {"moment_seq": 1, "quote": "hi", "what_happened": "a", "why_it_matters": "b", "alternative_phrasing": "c", "reasoning": "This works better because d"},
            {"moment_seq": 2, "quote": "no", "what_happened": "a", "why_it_matters": "b", "alternative_phrasing": "c", "reasoning": "This works better because d"},
            {"moment_seq": 3, "quote": "yes", "what_happened": "a", "why_it_matters": "b", "alternative_phrasing": "c", "reasoning": "This works better because d"},
        ],
        improvement_steps=[
            {"step": "s1", "why": "w1", "practice_drill": "p1", "linked_skill": "l1"},
            {"step": "s2", "why": "w2", "practice_drill": "p2", "linked_skill": "l2"},
            {"step": "s3", "why": "w3", "practice_drill": "p3", "linked_skill": "l3"},
        ],
        summary="Solid run",
        hidden_reveal="Secret reveal",
        success_criteria_results=[],
    )
    session_obj.evaluation = eval_record

    db_mock = AsyncMock()
    exec_mock = MagicMock()
    exec_mock.scalar_one_or_none.return_value = session_obj
    db_mock.execute.return_value = exec_mock

    provider_mock = AsyncMock()
    res = await ScoringService.evaluate_session(db_mock, "s123", provider_mock)
    assert res.overall_score == 88
    assert res.overall_summary == "Solid run"
    provider_mock.complete.assert_not_called()


@pytest.mark.asyncio
async def test_evaluate_session_repair_retry_and_fallback():
    """Verify repair retry loop triggers fallback when provider returns invalid responses."""
    scenario = Scenario(
        id="sc1",
        title="Test Scenario",
        brief="Brief",
        persona={"name": "Alex", "role": "VP"},
        hidden_motivations=["Secret motivation"],
        success_criteria=["Crit 1"],
        skills_assessed=[{"skill": "empathy", "weight": 1.0}],
    )
    session_obj = SimulationSession(
        id="s456",
        user_id="u1",
        scenario_id="sc1",
        mode="text",
        status="active",
        scenario=scenario,
        messages=[
            Message(seq=1, role="counterpart", content="Hello there"),
            Message(seq=2, role="trainee", content="Hi, glad to meet"),
        ],
    )
    session_obj.evaluation = None

    db_mock = AsyncMock()
    db_mock.add = MagicMock()
    exec_session = MagicMock()
    exec_session.scalar_one_or_none.return_value = session_obj

    exec_skills = MagicMock()
    skill = Skill(key="empathy", name="Empathy", rubric={"3": "Standard"})
    exec_skills.scalars.return_value.all.return_value = [skill]

    db_mock.execute.side_effect = [exec_session, exec_skills]

    # Provider always returns invalid JSON
    provider_mock = AsyncMock()
    provider_mock.complete.return_value = LLMResponse(
        content="INVALID NON-JSON RESPONSE",
        prompt_tokens=10,
        completion_tokens=5,
        total_tokens=15,
        cost_estimate=0.0,
        finish_reason="stop",
    )

    report = await ScoringService.evaluate_session(db_mock, "s456", provider_mock)
    assert report.is_fallback is True
    assert provider_mock.complete.call_count == 4  # 1 initial + 3 repair retries
    assert session_obj.status == "completed"
    db_mock.commit.assert_called_once()
