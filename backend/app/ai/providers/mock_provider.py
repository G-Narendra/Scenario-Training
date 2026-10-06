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

    def _generate_mock_evaluation(self, prompt: str) -> str:
        """Generates valid structured JSON evaluation quoting actual trainee transcript turns."""
        import json
        import re

        # Extract trainee turns from transcript lines: [Turn X] TRAINEE: text
        trainee_turns = []
        for line in prompt.splitlines():
            m = re.match(r"\[Turn\s+(\d+)\]\s+TRAINEE:\s+(.*)", line.strip(), re.IGNORECASE)
            if m:
                seq = int(m.group(1))
                text = m.group(2).strip()
                if text:
                    trainee_turns.append((seq, text))

        # Fallback if no trainee turns found in prompt
        if not trainee_turns:
            trainee_turns = [(2, "Could you share what your top priorities are for this quarter?")]

        # Extract skills
        skills = []
        for line in prompt.splitlines():
            m = re.match(r"\*\s+Skill:\s+\*\*([a-zA-Z0-9_-]+)\*\*", line.strip())
            if m:
                skills.append(m.group(1))
        if not skills:
            skills = ["discovery_questions", "objection_handling", "value_articulation", "closing_next_steps"]

        q1_seq, q1_text = trainee_turns[0]
        q2_seq, q2_text = trainee_turns[min(1, len(trainee_turns) - 1)]
        q3_seq, q3_text = trainee_turns[-1]

        report = {
            "overall_summary": "The trainee demonstrated solid conversational command, effectively de-escalating counterpart pushback while probing for strategic context.",
            "skill_scores": [
                {
                    "skill": s,
                    "score": 4 if i % 2 == 0 else 3,
                    "rubric_level_reached": f"Rubric Level {4 if i % 2 == 0 else 3} demonstrated with clear evidence.",
                    "justification": f"Demonstrated solid application of {s.replace('_', ' ')} during turns {q1_seq} and {q2_seq}."
                }
                for i, s in enumerate(skills)
            ],
            "what_worked": [
                {
                    "moment_seq": q1_seq,
                    "quote": q1_text,
                    "why_it_worked": "Framed the discussion around mutual objectives and lowered counterpart guardedness."
                }
            ],
            "what_didnt": [
                {
                    "moment_seq": q2_seq,
                    "quote": q2_text,
                    "why_it_missed": "Could delve deeper into operational constraints before proposing specific timing."
                }
            ],
            "key_moments": [
                {
                    "moment_seq": q1_seq,
                    "quote": q1_text,
                    "what_happened": "Initial conversational inquiry.",
                    "why_it_matters": "Established collaborative dialogue without triggering defensive resistance.",
                    "alternative_phrasing": "What specific outcomes are essential for your department before we discuss pricing?",
                    "reasoning": "This works better because open questions reveal hidden budgetary constraints early."
                },
                {
                    "moment_seq": q2_seq,
                    "quote": q2_text,
                    "what_happened": "Objection exploration turn.",
                    "why_it_matters": "Crucial moment to differentiate value rather than trading price concessions.",
                    "alternative_phrasing": "Help me understand the internal benchmarks your CFO is looking for.",
                    "reasoning": "This works better because it addresses internal organizational pressures directly."
                },
                {
                    "moment_seq": q3_seq,
                    "quote": q3_text,
                    "what_happened": "Closing transition turn.",
                    "why_it_matters": "Determines whether the interaction concludes with tangible momentum or stalls.",
                    "alternative_phrasing": "Let's schedule thirty minutes next Thursday to review the updated financial analysis together.",
                    "reasoning": "This works better because setting concrete dates establishes reciprocal accountability."
                }
            ],
            "hidden_reveal": "The counterpart faced an aggressive executive cost-reduction target, but privately valued vendor stability.",
            "success_criteria_results": [
                {
                    "criterion": "Uncover underlying counterpart objectives",
                    "met": True,
                    "evidence": f"Trainee probed for priorities at turn {q1_seq}."
                },
                {
                    "criterion": "Secure clear commitment and next steps",
                    "met": True,
                    "evidence": f"Established agreed follow-up communication at turn {q3_seq}."
                }
            ],
            "improvement_steps": [
                {
                    "step": "Deploy open-ended discovery questions in the first two turns",
                    "why": "Uncovers unstated budget parameters before positions harden",
                    "practice_drill": "Practice the TED question model (Tell, Explain, Describe) on 3 opening scenarios.",
                    "linked_skill": skills[0] if skills else "discovery_questions"
                },
                {
                    "step": "Acknowledge and label emotional subtext before offering solutions",
                    "why": "Lowers counterpart resistance and builds trust",
                    "practice_drill": "Practice mirror-and-label responses to cost pushback before presenting data.",
                    "linked_skill": skills[1] if len(skills) > 1 else "objection_handling"
                },
                {
                    "step": "Secure concrete calendar next steps with clear mutual agendas",
                    "why": "Maintains momentum and prevents stalled negotiations",
                    "practice_drill": "Conclude every mock call with a specific date, time, and stakeholder list.",
                    "linked_skill": skills[2] if len(skills) > 2 else "closing_next_steps"
                }
            ]
        }
        return json.dumps(report)

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

        # Check if evaluator call
        for m in reversed(messages):
            if m.role == "user" and ("TRANSCRIPT OF SIMULATION" in m.content or "REQUIRED JSON RESPONSE STRUCTURE" in m.content):
                return self._generate_mock_evaluation(m.content)

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
