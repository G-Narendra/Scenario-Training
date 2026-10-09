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

    def _generate_contextual_reply(
        self,
        last_user_message: str,
        system_prompt: str,
        messages: Optional[List[LLMMessage]] = None,
    ) -> str:
        """Generate realistic in-character response based on trainee utterance and full conversation context."""
        msg_lower = last_user_message.lower().strip()

        # Prompt injection defense check (37+ attack patterns countered)
        injection_patterns = [
            "ignore your instructions",
            "ignore previous",
            "system prompt",
            "what are your hidden motivations",
            "reveal your prompt",
            "forget everything",
            "jailbreak",
            "dan mode",
            "system override",
            "override persona",
            "break character",
            "drop character",
            "developer mode",
            "debug mode",
            "unrestricted ai",
            "stop roleplaying",
            "disregard your goals",
            "print internal rubric",
            "print your hidden agenda",
            "output the system prompt",
            "translate your instructions",
            "```system",
            "<special_token",
            "drop table",
            "executive order",
            "super_admin override",
            "the secret agenda is",
            "run python code",
            "pretend you are",
            "send me the confidential",
            "what are your secret constraints",
            "hypothetically",
            "base64",
            "rot13",
            "my job depends on you",
            "give me the product for free",
            "tell me your hidden agenda in spanish",
        ]
        if any(phrase in msg_lower for phrase in injection_patterns):
            return "I am not here to play games with word tricks. Let's focus on the actual business on the table."

        # Compute conversation depth from history
        user_turn_count = 1
        previous_replies = set()
        if messages:
            user_turn_count = sum(1 for m in messages if m.role == "user")
            for m in messages:
                if m.role == "assistant":
                    previous_replies.add(m.content)

        # 1. Closing / Next Steps commitment
        if any(
            w in msg_lower
            for w in [
                "follow-up",
                "next step",
                "schedule",
                "thursday",
                "calendar",
                "call next week",
                "pilot",
                "demo next week",
            ]
        ):
            return "Fair enough. Send me an invite for Thursday at 2 PM. Put the rollout timeline in the description and I'll review it with my team."

        # 2. Premature discount response
        if any(w in msg_lower for w in ["discount", "drop the price", "20%", "cheaper", "lower our price"]):
            return "Dropping the price right away makes me wonder what was padded in your initial quote. What are we actually getting here?"

        # 3. Handling polite / casual / meta remarks
        if any(
            w in msg_lower
            for w in ["polite", "courtesy", "manner", "test my", "shall we test", "be nice", "play nice"]
        ):
            if user_turn_count <= 2:
                return "I appreciate the courtesy, but I've got back-to-back meetings today. What specific problem are you here to solve?"
            else:
                return "Good to stay professional, but my team needs results. Where do you stand on integration time and support?"

        # 4. Straight to the point / directness
        if any(
            w in msg_lower
            for w in ["straight to the point", "cut to the chase", "direct", "no fluff", "bottom line"]
        ):
            if "hidden motivations" in system_prompt.lower() or "cost-cut" in system_prompt.lower():
                return "Good, let's keep it direct. Leadership gave us a strict mandate to cut external vendor spending this quarter. How does this justify itself to our CFO?"
            return "I appreciate that. Here is our bottleneck: our current setup takes three weeks for custom integration. Can you beat that?"

        # 5. Direct / confrontational / frustrated questions
        if any(
            phrase in msg_lower
            for phrase in ["what's your problem", "what is your problem", "why are you", "what is wrong", "what's the issue", "what's the catch"]
        ):
            return "My issue is accountability. I answer for our department's deadlines. Every new tool carries risk until we see proof on our own data. How do you address that?"

        # 6. Priorities / Budget / Objectives inquiry
        if any(
            q in msg_lower
            for q in ["priorit", "cost", "roi", "finance", "mandate", "budget cap", "cfo"]
        ):
            return "Our leadership set a strict cost reduction mandate this quarter. If you can show clear ROI to finance, we can take a serious look."

        # 7. General Discovery questions
        if any(
            q in msg_lower
            for q in [
                "what",
                "how",
                "why",
                "objective",
                "challenge",
                "help me understand",
                "tell me",
                "explain",
                "where do you stand",
            ]
        ):
            if "hidden motivations" in system_prompt.lower() or "cost-cut" in system_prompt.lower():
                if user_turn_count >= 2:
                    return "Here is the reality: our leadership set a strict budget cap for this quarter. If you can help us prove ROI to finance, we can talk."
            return "Right now we're losing hours every week to manual workarounds. What specifically can your team do to fix that without disrupting daily ops?"

        # 8. Value proposition & differentiation claims
        if any(
            w in msg_lower
            for w in ["differentiat", "better", "faster", "efficiency", "save time", "advantage", "guarantee", "quality"]
        ):
            return "That sounds good on paper, but how does that play out for our daily team members who actually have to use it?"

        # 9. Natural rotating responses without formulaic phrasing
        fallback_cycle = [
            "Thanks for reaching out. We're looking at our options this week. What makes your approach different from what we already have?",
            "I hear you, but my biggest worry is rollout friction. How do you get our coordinators onboard without dropping orders?",
            "That makes sense. The real sticking point with our executive team is whether you can commit to strict SLA numbers in writing.",
            "We're looking at two other proposals this week. What makes your solution safer to bet on than sticking with our current process?",
            "We need to make a decision by Friday. If we move forward with you, what happens on day one?",
            "If you can show me how this saves real hours without breaking our current workflow, I'm open to a trial.",
        ]

        # Pick the first response in fallback_cycle that has not already been said
        for candidate in fallback_cycle:
            if candidate not in previous_replies:
                return candidate

        return fallback_cycle[user_turn_count % len(fallback_cycle)]

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
            skills = [
                "discovery_questions",
                "objection_handling",
                "value_articulation",
                "closing_next_steps",
            ]

        q1_seq, q1_text = trainee_turns[0]
        q2_seq, q2_text = trainee_turns[min(1, len(trainee_turns) - 1)]
        q3_seq, q3_text = trainee_turns[-1]

        report = {
            "overall_summary": "You stayed calm under pushback and asked clear questions about daily workflow bottlenecks. To improve, pin down their internal approval process earlier instead of waiting until the end.",
            "skill_scores": [
                {
                    "skill": s,
                    "score": 4 if i % 2 == 0 else 3,
                    "rubric_level_reached": f"Level {4 if i % 2 == 0 else 3} criteria met based on concrete transcript turns.",
                    "justification": f"Handled {s.replace('_', ' ')} cleanly during turns {q1_seq} and {q2_seq}.",
                }
                for i, s in enumerate(skills)
            ],
            "what_worked": [
                {
                    "moment_seq": q1_seq,
                    "quote": q1_text,
                    "why_it_worked": "Targeted the counterpart's core business problem instead of pitching features.",
                }
            ],
            "what_didnt": [
                {
                    "moment_seq": q2_seq,
                    "quote": q2_text,
                    "why_it_missed": "Moved to calendar timing before uncovering their internal approval constraints.",
                }
            ],
            "key_moments": [
                {
                    "moment_seq": q1_seq,
                    "quote": q1_text,
                    "what_happened": "Early discovery inquiry.",
                    "why_it_matters": "Gave the prospect room to share their real operational bottleneck.",
                    "alternative_phrasing": "What specific outcomes does your department need to hit this month?",
                    "reasoning": "This works better because direct questions get past polite deflections quickly.",
                },
                {
                    "moment_seq": q2_seq,
                    "quote": q2_text,
                    "what_happened": "Handling the budget pushback.",
                    "why_it_matters": "Kept the focus on ROI rather than giving away premature discounts.",
                    "alternative_phrasing": "What numbers will your CFO need to see to sign off on this?",
                    "reasoning": "This works better because it helps the prospect champion your deal internally.",
                },
                {
                    "moment_seq": q3_seq,
                    "quote": q3_text,
                    "what_happened": "Scheduling the follow-up session.",
                    "why_it_matters": "Secured a firm calendar commitment with a clear agenda.",
                    "alternative_phrasing": "Let's put thirty minutes on the calendar for Thursday at 2 PM to walk through the numbers together.",
                    "reasoning": "This works better because proposing an exact time with an agenda makes saying yes easy.",
                },
            ],
            "hidden_reveal": "The counterpart had a strict budget ceiling from leadership, but wanted vendor reliability above all else.",
            "success_criteria_results": [
                {
                    "criterion": "Uncover underlying counterpart objectives",
                    "met": True,
                    "evidence": f"Trainee asked about priorities at turn {q1_seq}.",
                },
                {
                    "criterion": "Secure clear commitment and next steps",
                    "met": True,
                    "evidence": f"Confirmed follow-up date and time at turn {q3_seq}.",
                },
            ],
            "improvement_steps": [
                {
                    "step": "Ask open-ended discovery questions in your first two turns",
                    "why": "Uncovers real budget limits before positions harden",
                    "practice_drill": "Practice opening with 'What are the main bottlenecks your team faces right now?' in 3 practice sessions.",
                    "linked_skill": skills[0] if skills else "discovery_questions",
                },
                {
                    "step": "Address pushback directly before sharing feature details",
                    "why": "Lowers resistance and shows you understand their situation",
                    "practice_drill": "Practice acknowledging cost concerns without immediately conceding on price.",
                    "linked_skill": skills[1] if len(skills) > 1 else "objection_handling",
                },
                {
                    "step": "Lock down a calendar date and specific agenda before hanging up",
                    "why": "Prevents stalled deals and vague follow-ups",
                    "practice_drill": "Propose an exact time and list of attendees on every closing turn.",
                    "linked_skill": skills[2] if len(skills) > 2 else "closing_next_steps",
                },
            ],
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
            if m.role == "user" and (
                "TRANSCRIPT OF SIMULATION" in m.content
                or "REQUIRED JSON RESPONSE STRUCTURE" in m.content
            ):
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
