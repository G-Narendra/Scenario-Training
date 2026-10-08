import logging
from typing import Any, Dict, List, Optional, Tuple

from backend.app.ai.providers.base import LLMMessage, LLMProvider

logger = logging.getLogger(__name__)


class ConclusionDetector:
    """Evaluates whether the conversation has reached a natural conclusion or impasse."""

    @staticmethod
    def detect_heuristic(
        last_counterpart_message: str,
        conclusion_signals: Dict[str, Any],
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Fast heuristic scan of counterpart reply against known completion patterns.
        Returns (is_concluded, outcome_type, reason).
        """
        text_lower = last_counterpart_message.lower()

        # Check positive conclusion indicators
        positive_keywords = [
            "send an invite",
            "send the invite",
            "send a calendar invite",
            "thursday at 2",
            "thursday at 2 pm",
            "lets do a pilot",
            "let's do a pilot",
            "schedule the follow-up",
            "we have a deal",
            "agreed to terms",
            "let's proceed with",
            "let's set up the review with the team",
            "see you next week",
        ]
        for kw in positive_keywords:
            if kw in text_lower:
                return True, "positive", f"Counterpart agreed to clear next step: '{kw}'"

        pos_signals = conclusion_signals.get("positive", [])
        for sig in pos_signals:
            words = [w.lower() for w in sig.split() if len(w) > 3]
            if len(words) >= 2 and all(w in text_lower for w in words[:2]):
                return True, "positive", f"Matched positive signal: {sig}"

        # Check negative conclusion indicators
        negative_keywords = [
            "we are going with the competitor",
            "decided to go with another vendor",
            "i am ending this meeting",
            "have nothing more to say",
            "no longer interested",
            "please remove us from your list",
            "goodbye.",
            "goodbye!",
            "i'm walking away",
        ]
        for kw in negative_keywords:
            if kw in text_lower:
                return True, "negative", f"Counterpart ended conversation: '{kw}'"

        neg_signals = conclusion_signals.get("negative", [])
        for sig in neg_signals:
            words = [w.lower() for w in sig.split() if len(w) > 3]
            if len(words) >= 2 and all(w in text_lower for w in words[:2]):
                return True, "negative", f"Matched negative signal: {sig}"

        return False, None, None

    @classmethod
    async def evaluate_with_llm(
        cls,
        llm_provider: LLMProvider,
        transcript: List[Dict[str, str]],
        conclusion_signals: Dict[str, Any],
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Optional LLM-based conclusion classifier for complex ambiguous conclusions."""
        if len(transcript) < 4:
            return False, None, None

        system_prompt = (
            "You are a conversation conclusion classifier for a workplace scenario training exercise.\n"
            "Analyze the conversation and determine whether it has reached a natural conclusion.\n"
            "A conversation concludes if:\n"
            "1. POSITIVE: Both parties agreed on a definitive next step, pilot, follow-up meeting, or resolution.\n"
            "2. NEGATIVE: Counterpart explicitly walks away, terminates meeting, or firmly rejects continuation.\n"
            "3. ONGOING: Still actively negotiating, clarifying, discussing, or handling objections.\n"
            "Respond ONLY with one word: POSITIVE, NEGATIVE, or ONGOING."
        )

        history_text = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in transcript[-6:])
        messages = [
            LLMMessage(role="user", content=f"Recent dialogue:\n{history_text}\n\nOutcome status:"),
        ]

        try:
            res = await llm_provider.complete(
                messages, system_prompt, max_tokens=10, temperature=0.0
            )
            status_word = res.content.strip().upper()
            if "POSITIVE" in status_word:
                return True, "positive", "Classified as natural positive conclusion"
            if "NEGATIVE" in status_word:
                return True, "negative", "Classified as natural negative conclusion"
        except Exception as e:
            logger.warning(f"Conclusion detector LLM error, using heuristic fallback: {e}")

        # Fallback to last counterpart heuristic
        last_counterpart = ""
        for m in reversed(transcript):
            if m.get("role") == "counterpart":
                last_counterpart = m.get("content", "")
                break
        return cls.detect_heuristic(last_counterpart, conclusion_signals)
