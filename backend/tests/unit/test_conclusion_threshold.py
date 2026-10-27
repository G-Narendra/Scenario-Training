import pytest
from backend.app.ai.engine.conclusion_detector import ConclusionDetector


def test_minimum_two_turn_threshold_prevents_early_conclusion():
    """
    Enforce curriculum rule:
    AI counterpart cannot prematurely end a scenario on turns 1 or 2,
    even if positive/negative conclusion phrases are present in the reply.
    """
    signals = {
        "positive": ["Agrees to pilot", "Thursday at 2"],
        "negative": ["Ends meeting", "Going with competitor"],
    }
    msg_with_conclusion = "Sounds great, send an invite and let's meet Thursday at 2."

    # Turn 1: MUST NOT conclude
    concluded, outcome, reason = ConclusionDetector.detect_heuristic(
        last_counterpart_message=msg_with_conclusion,
        conclusion_signals=signals,
        current_turn=1,
        min_turns=3,
    )
    assert not concluded
    assert outcome is None

    # Turn 2: MUST NOT conclude
    concluded, outcome, reason = ConclusionDetector.detect_heuristic(
        last_counterpart_message=msg_with_conclusion,
        conclusion_signals=signals,
        current_turn=2,
        min_turns=3,
    )
    assert not concluded
    assert outcome is None

    # Turn 3: CAN naturally conclude
    concluded, outcome, reason = ConclusionDetector.detect_heuristic(
        last_counterpart_message=msg_with_conclusion,
        conclusion_signals=signals,
        current_turn=3,
        min_turns=3,
    )
    assert concluded
    assert outcome == "positive"
