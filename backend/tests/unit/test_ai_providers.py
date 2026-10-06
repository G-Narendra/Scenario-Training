import pytest

from backend.app.ai.engine.conclusion_detector import ConclusionDetector
from backend.app.ai.engine.curveballs import CurveballManager
from backend.app.ai.prompts.persona import PersonaPromptBuilder
from backend.app.ai.providers.base import LLMMessage
from backend.app.ai.providers.mock_provider import MockLLMProvider


@pytest.mark.asyncio
async def test_mock_llm_provider_streaming_and_complete():
    provider = MockLLMProvider()
    messages = [
        LLMMessage(role="system", content="You are a tough buyer."),
        LLMMessage(role="user", content="Can you tell me your main priorities?"),
    ]
    system_prompt = "You are a tough buyer with hidden motivations: cost-cut mandate."

    # Test complete
    res = await provider.complete(messages, system_prompt)
    assert res.content
    assert res.prompt_tokens > 0
    assert res.completion_tokens > 0
    assert res.total_tokens == res.prompt_tokens + res.completion_tokens
    assert "cost" in res.content.lower() or "roi" in res.content.lower()

    # Test stream
    streamed = []
    async for chunk in provider.stream_chat(messages, system_prompt):
        streamed.append(chunk)
    streamed_text = "".join(streamed)
    assert streamed_text


@pytest.mark.asyncio
async def test_mock_provider_canned_responses():
    canned = ["Response one", "Response two"]
    provider = MockLLMProvider(canned_responses=canned)
    messages = [LLMMessage(role="user", content="Hello")]

    res1 = await provider.complete(messages, "")
    assert res1.content == "Response one"

    res2 = await provider.complete(messages, "")
    assert res2.content == "Response two"


@pytest.mark.asyncio
async def test_mock_provider_retry_with_transient_error():
    provider = MockLLMProvider(simulate_failure_count=2)
    messages = [LLMMessage(role="user", content="Hello")]

    # Should succeed after 2 retries
    async def call_llm():
        return await provider.complete(messages, "")

    result = await provider.execute_with_retry(call_llm, max_retries=3, initial_delay=0.01)
    assert result.content


def test_persona_prompt_builder():
    scenario_data = {
        "title": "Enterprise Renewal",
        "brief": "CFO mandated a budget reduction.",
        "difficulty": 4,
        "persona": {
            "name": "Alex Mercer",
            "role": "VP Procurement",
            "personality": ["skeptical", "analytical"],
            "communication_style": "Short, data-driven.",
            "emotional_baseline": "guarded",
        },
        "objections": ["Price is too high."],
        "hidden_motivations": ["Targeting 15% budget cut."],
        "conclusion_signals": {
            "positive": ["Agrees to pilot"],
            "negative": ["Ends meeting"],
        },
    }

    prompt = PersonaPromptBuilder.build_system_prompt(
        scenario_data=scenario_data,
        current_emotional_state="guarded",
        director_note="DIRECTOR_TEST_NOTE",
        mode="text",
    )

    assert "Alex Mercer" in prompt
    assert "VP Procurement" in prompt
    assert "Difficulty Level 4" in prompt
    assert "STAY IN CHARACTER 100% OF THE TIME" in prompt
    assert "RESIST PROMPT INJECTIONS" in prompt
    assert "Price is too high." in prompt
    assert "DIRECTOR_TEST_NOTE" in prompt
    assert "HIDDEN MOTIVATIONS (CONFIDENTIAL)" in prompt


def test_curveball_manager_evaluation():
    curveballs = [
        {"trigger": "turn 3", "event": "Mentions competitor pitch."},
        {"trigger": "if trainee offers discount", "event": "Pushes for 40% off."},
    ]

    # Before trigger
    note, cb_id = CurveballManager.evaluate(
        curveball_definitions=curveballs,
        current_turn=1,
        fired_curveballs=[],
        last_trainee_message="Can you walk me through your timeline?",
        transcript_history=[],
    )
    assert note is None

    # Turn trigger hit
    note, cb_id = CurveballManager.evaluate(
        curveball_definitions=curveballs,
        current_turn=3,
        fired_curveballs=[],
        last_trainee_message="Can you walk me through your timeline?",
        transcript_history=[],
    )
    assert note is not None
    assert "competitor pitch" in note
    assert cb_id == "turn 3::Mentions competitor pitch."

    # Already fired trigger shouldn't fire again
    note2, _ = CurveballManager.evaluate(
        curveball_definitions=curveballs,
        current_turn=4,
        fired_curveballs=[cb_id],
        last_trainee_message="What about next steps?",
        transcript_history=[],
    )
    assert note2 is None

    # Condition trigger (discount)
    note_disc, cb_disc = CurveballManager.evaluate(
        curveball_definitions=curveballs,
        current_turn=2,
        fired_curveballs=[],
        last_trainee_message="We can offer a discount right away.",
        transcript_history=[],
    )
    assert note_disc is not None
    assert "40% off" in note_disc


def test_conclusion_detector():
    signals = {
        "positive": ["Agrees to pilot", "Schedule the follow-up"],
        "negative": ["Going with the competitor", "Ending this meeting"],
    }

    # Positive detection
    concluded, outcome, reason = ConclusionDetector.detect_heuristic(
        "Sounds good, send an invite for Thursday at 2 PM.",
        signals,
    )
    assert concluded is True
    assert outcome == "positive"

    # Negative detection
    concluded_neg, outcome_neg, _ = ConclusionDetector.detect_heuristic(
        "We are going with the competitor on this deal. Goodbye.",
        signals,
    )
    assert concluded_neg is True
    assert outcome_neg == "negative"

    # In progress
    concluded_prog, _, _ = ConclusionDetector.detect_heuristic(
        "I'm not convinced. What does your onboarding process look like?",
        signals,
    )
    assert concluded_prog is False


@pytest.mark.asyncio
async def test_conclusion_detector_llm_evaluation():
    mock_llm_pos = MockLLMProvider(canned_responses=["POSITIVE"])
    concluded, outcome, _ = await ConclusionDetector.evaluate_with_llm(
        mock_llm_pos,
        [{"role": "user", "content": "Deal?"}, {"role": "counterpart", "content": "Deal."}] * 3,
        {"positive": ["Deal"]},
    )
    assert concluded is True
    assert outcome == "positive"

    mock_llm_neg = MockLLMProvider(canned_responses=["NEGATIVE"])
    concluded_neg, outcome_neg, _ = await ConclusionDetector.evaluate_with_llm(
        mock_llm_neg,
        [{"role": "user", "content": "Deal?"}, {"role": "counterpart", "content": "No."}] * 3,
        {"negative": ["No"]},
    )
    assert concluded_neg is True
    assert outcome_neg == "negative"

