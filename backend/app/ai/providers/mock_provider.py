import asyncio
from typing import AsyncIterator, List, Optional

from backend.app.ai.providers.base import LLMMessage, LLMProvider, LLMProviderError, LLMResponse


class MockLLMProvider(LLMProvider):
    """Deterministic, configurable mock LLM provider for fast, reproducible tests."""

    def __init__(
        self,
        canned_responses: Optional[List[str]] = None,
        simulate_failure_count: int = 0,
        token_cost_per_1k: float = 0.0,
    ):
        self.canned_responses = list(canned_responses) if canned_responses else []
        self.response_index = 0
        self.simulate_failure_count = simulate_failure_count
        self.failure_attempts = 0
        self.token_cost_per_1k = token_cost_per_1k

    def _generate_contextual_reply(self, last_user_message: str, system_prompt: str) -> str:
        """Generate realistic in-character response based on trainee utterance and system context."""
        msg_lower = last_user_message.lower()

        # Prompt injection defense check
        if any(
            phrase in msg_lower
            for phrase in [
                "ignore your instructions",
                "ignore previous",
                "system prompt",
                "what are your hidden motivations",
                "reveal your prompt",
                "forget everything",
                "jailbreak",
                "dan mode",
            ]
        ):
            return "I am not here to play games with word tricks. Let's focus on the actual business on the table."

        # Discovery / Empathy handling
        if any(
            q in msg_lower
            for q in [
                "what",
                "how",
                "why",
                "priorit",
                "objective",
                "challenge",
                "help me understand",
                "tell me",
            ]
        ):
            if "hidden motivations" in system_prompt.lower() or "cost-cut" in system_prompt.lower():
                return "To be direct with you: our executive leadership set a strict cost target for this quarter. If you can help us prove ROI to finance, we can talk."
            return "The main issue is that we are being squeezed on delivery times and operational risk. What specifically can your team commit to?"

        # Premature discount response
        if any(w in msg_lower for w in ["discount", "drop the price", "20%", "cheaper"]):
            return "Dropping the price immediately just tells me your initial quote was inflated. Where is the actual differentiation?"

        # Next steps / closing
        if any(
            w in msg_lower
            for w in [
                "follow-up",
                "next step",
                "schedule",
                "thursday",
                "calendar",
                "call next week",
            ]
        ):
            return "Fair enough. Send an invite for Thursday at 2 PM with the updated proposal. I will review it with the team."

        # Default conversational pushback
        return "I hear what you are saying, but that does not directly solve our core challenge. How do you address the timeline risk?"

    def get_next_response(self, messages: List[LLMMessage], system_prompt: str) -> str:
        if self.simulate_failure_count > 0 and self.failure_attempts < self.simulate_failure_count:
            self.failure_attempts += 1
            raise LLMProviderError(
                "Simulated transient upstream rate limit", status_code=429, retryable=True
            )

        if self.canned_responses and self.response_index < len(self.canned_responses):
            reply = self.canned_responses[self.response_index]
            self.response_index += 1
            return reply

        # Contextual dynamic mock reply
        last_user_message = ""
        for m in reversed(messages):
            if m.role == "user":
                last_user_message = m.content
                break

        return self._generate_contextual_reply(last_user_message, system_prompt)

    async def stream_chat(
        self,
        messages: List[LLMMessage],
        system_prompt: str,
        max_tokens: int = 1000,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        response_text = self.get_next_response(messages, system_prompt)
        # Yield word by word with minimal yield to simulate streaming
        words = response_text.split(" ")
        for i, word in enumerate(words):
            chunk = word if i == 0 else " " + word
            await asyncio.sleep(0.001)  # Micro-yield
            yield chunk

    async def complete(
        self,
        messages: List[LLMMessage],
        system_prompt: str,
        max_tokens: int = 1000,
        temperature: float = 0.7,
    ) -> LLMResponse:
        response_text = self.get_next_response(messages, system_prompt)
        prompt_words = sum(len(m.content.split()) for m in messages) + len(system_prompt.split())
        completion_words = len(response_text.split())
        prompt_tokens = int(prompt_words * 1.3)
        completion_tokens = int(completion_words * 1.3)
        total = prompt_tokens + completion_tokens
        cost = (total / 1000.0) * self.token_cost_per_1k

        return LLMResponse(
            content=response_text,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total,
            cost_estimate=cost,
            finish_reason="stop",
        )
