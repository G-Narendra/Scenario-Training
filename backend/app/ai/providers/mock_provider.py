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

        # Detect track persona from system_prompt
        is_leadership = any(
            kw in system_prompt.lower()
            for kw in [
                "track: leadership",
                "direct report",
                "underperform",
                "psychological safety",
                "whistleblower",
                "reorganization",
                "cross-functional resistance",
                "boardroom crisis",
            ]
        )

        # Extract dynamic persona & scenario metadata from system_prompt
        import re

        scenario_match = re.search(r"Scenario:\s*(.+)", system_prompt)
        scenario_title = scenario_match.group(1).strip() if scenario_match else "the situation"

        name_match = re.search(r"Your Name:\s*(.+)", system_prompt)
        char_name = name_match.group(1).strip() if name_match else "Partner"

        role_match = re.search(r"Your Role:\s*(.+)", system_prompt)
        char_role = role_match.group(1).strip() if role_match else ("Manager" if is_leadership else "Decision Maker")

        # Parse key objections from system prompt block
        objections = []
        in_obj_block = False
        for line in system_prompt.splitlines():
            line_str = line.strip()
            if line_str == "=== YOUR KEY OBJECTIONS ===":
                in_obj_block = True
                continue
            if in_obj_block and line_str.startswith("==="):
                in_obj_block = False
                break
            if in_obj_block and line_str.startswith("-"):
                obj_text = line_str.lstrip("- ").strip()
                if obj_text and obj_text != "None specified.":
                    objections.append(obj_text)

        # Fallback objections if not parsed
        if not objections:
            if is_leadership:
                objections = [
                    "our current team workload is already at capacity",
                    "we cannot compromise on deliverable quality or deadlines",
                    "any changes must have clear leadership backing",
                ]
            else:
                objections = [
                    "our current budget is tightly capped for this quarter",
                    "we cannot risk workflow disruption during implementation",
                    "we need clear proof of ROI before committing to anything",
                ]

        primary_objection = objections[0]
        secondary_objection = objections[1] if len(objections) > 1 else objections[0]

        # 1. Apologies / passive / deflated responses ("sorry", "my apologies", "apologize", "my bad")
        if any(w in msg_lower for w in ["sorry", "apolog", "my bad", "forgive", "excuse me"]):
            if is_leadership:
                return f"I appreciate the apology, but we have a live deadline here. What can we actually adjust today so we aren't blocked again tomorrow?"
            else:
                return f"Look, an apology doesn't fix our deliverable timeline. What is your team actually doing today to resolve this roadblock?"

        # 2. Extremely short / non-substantive answers ("ok", "k", "yes", "no", "fine", "cool", "sure", "idk", <= 2 words)
        words = msg_lower.split()
        if len(words) <= 2 and any(w in ["ok", "k", "yes", "no", "sure", "fine", "cool", "idk", "why", "what", "hello", "hi", "hey"] for w in words):
            if is_leadership:
                return f"Thanks for stepping in. We cannot keep losing two days every release cycle just because QA wants to re-test untouched modules. Where do you stand on resolving this?"
            else:
                return f"A one-word reply doesn't give me any confidence. We're considering a significant commitment here. Walk me through your actual approach and timeline."

        # 3. Closing / Next Steps commitment (Guard: do not agree on first turn)
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
                "wrap up",
                "conclude",
                "set a time",
            ]
        ):
            if user_turn_count <= 1:
                return f"It's too early to put time on the calendar. We still haven't resolved our core blocker. How do you propose we address that first?"
            else:
                return f"Fair enough. Let's document these agreed action items and review our alignment this Thursday at 2 PM."

        # 4. Premature concessions / discounts / compromises
        if any(w in msg_lower for w in ["discount", "drop the price", "20%", "cheaper", "lower our price", "concession", "compromise"]):
            if is_leadership:
                return f"Dropping standards or making quick compromises won't solve the core issue. What we need is to solve this without cutting corners."
            else:
                return f"Dropping the price right away makes me wonder what was padded in your initial numbers. The real issue is whether you can handle our requirements."

        # 5. Handling polite / casual / meta remarks
        if any(
            w in msg_lower
            for w in ["polite", "courtesy", "manner", "test my", "shall we test", "be nice", "play nice", "hello", "good morning", "hi", "hey", "how are you"]
        ):
            if user_turn_count <= 2:
                return f"Hey. Good to connect. Honestly, I'm pretty stressed about our release timeline right now. We really need to get engineering and QA aligned today. What's your take on how we handle the testing backlog?"
            else:
                return f"I appreciate the courtesy, but we need concrete answers right now regarding our deliverables. What is your specific plan?"

        # 6. Straight to the point / directness
        if any(
            w in msg_lower
            for w in ["straight to the point", "cut to the chase", "direct", "no fluff", "bottom line"]
        ):
            return f"Good, let's keep it direct: My main concern right now is that {primary_objection}. How do you solve that?"

        # 7. Direct / confrontational / frustrated questions
        if any(
            phrase in msg_lower
            for phrase in ["what's your problem", "what is your problem", "why are you", "what is wrong", "what's the issue", "what's the catch"]
        ):
            return f"My concern is accountability. As {char_role}, I answer for our deliverables, and {primary_objection}. How do you address that?"

        # 8. Priorities / Budget / Objectives inquiry
        if any(
            q in msg_lower
            for q in ["priorit", "cost", "roi", "finance", "mandate", "budget cap", "cfo", "budget", "resource", "target"]
        ):
            return f"Our priority is straightforward: we must ensure {primary_objection} is resolved without putting the rest of the operation at risk. If you can prove that, we can move forward."

        # 9. General Discovery questions
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
            active_obj = objections[user_turn_count % len(objections)]
            return f"From my perspective: {active_obj}. How does your approach address that directly?"

        # 10. Value proposition & claims
        if any(
            w in msg_lower
            for w in ["differentiat", "better", "faster", "efficiency", "save time", "advantage", "guarantee", "quality", "proven"]
        ):
            return f"That sounds good on paper, but in our day-to-day work, {secondary_objection}. What concrete evidence can you show me?"

        # 11. Contextual Scenario Fallback Cycle
        fallback_cycle = [
            f"I hear what you're saying, but my biggest concern remains that {primary_objection}. How do we navigate that?",
            f"That sounds reasonable in theory, but as {char_role}, I need to know: how does this impact our immediate commitments?",
            f"If we commit to this direction, what specific support or escalation path will you provide when issues arise?",
            f"I appreciate you listening to my perspective. What does a successful resolution look like from your side over the next 30 days?",
            f"Let's make sure we have clear alignment before we proceed. What are the key milestones you're committing to?",
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

        # Extract skills or capabilities from evaluation prompt
        skills = []
        for line in prompt.splitlines():
            m = re.match(r"\*\s+(?:Skill|Capability):\s+\*\*([a-zA-Z0-9_ -]+)\*\*", line.strip())
            if m:
                skills.append(m.group(1).strip())
        if not skills:
            skills = [
                "discovery_questions",
                "objection_handling",
                "value_articulation",
                "closing_next_steps",
            ]

        is_leadership_eval = any(
            kw in prompt.lower()
            for kw in ["leadership", "direct report", "manager", "team", "psychological", "culture", "whistleblower", "conflict"]
        )

        q1_seq, q1_text = trainee_turns[0]
        q2_seq, q2_text = trainee_turns[min(1, len(trainee_turns) - 1)]
        q3_seq, q3_text = trainee_turns[-1]

        total_trainee_words = sum(len(text.split()) for _, text in trainee_turns)
        total_trainee_turns = len(trainee_turns)
        all_trainee_text = " ".join(t.lower() for _, t in trainee_turns).strip()

        # Check if conversation is non-substantive / trivial (e.g., student only said "sorry", single-word, or very few words)
        is_apology_only = any(
            all_trainee_text == w or all_trainee_text.startswith(w)
            for w in ["sorry", "i am sorry", "im sorry", "my apologies", "apologies", "my bad"]
        )
        is_trivial = total_trainee_turns <= 1 or total_trainee_words < 12 or is_apology_only

        if is_trivial:
            overall_summary = (
                f"Session terminated prematurely with non-substantive participation. You submitted minimal dialogue (e.g., \"{q1_text}\"), offering no discovery questions, active listening, or structured problem-solving. In an executive interaction, passive or single-word responses fail to build credibility or resolve counterpart concerns."
            )
            report = {
                "overall_summary": overall_summary,
                "skill_scores": [
                    {
                        "skill": s,
                        "score": 1,
                        "rubric_level_reached": "Level 1: Minimal or no demonstration of skill. Trainee offered non-substantive responses without addressing core scenario objectives.",
                        "justification": f"Failed to demonstrate {s.replace('_', ' ')}. Submitted minimal dialogue (\"{q1_text}\") without exploring counterpart requirements or proposing structured solutions.",
                    }
                    for s in skills
                ],
                "what_worked": [
                    {
                        "moment_seq": q1_seq,
                        "quote": q1_text,
                        "why_it_worked": "Acknowledged communication politely, though without addressing any business objectives or underlying operational issues.",
                    }
                ],
                "what_didnt": [
                    {
                        "moment_seq": q1_seq,
                        "quote": q1_text,
                        "why_it_missed": "Submitted a superficial response without probing the counterpart's core business problem or establishing actionable direction.",
                    }
                ],
                "key_moments": [
                    {
                        "moment_seq": q1_seq,
                        "quote": q1_text,
                        "what_happened": "Non-substantive or premature interaction.",
                        "why_it_matters": "Leaving a stakeholder or client with a minimal response halts the conversation and damages professional standing.",
                        "alternative_phrasing": "I understand the urgency around this deliverable and take full ownership. Can you share what impact this is having on your team's immediate milestones so we can prioritize together?",
                        "reasoning": "This works better because pairing accountability with an exploratory question immediately re-opens constructive problem-solving.",
                    },
                    {
                        "moment_seq": q1_seq,
                        "quote": q1_text,
                        "what_happened": "Absence of discovery inquiry.",
                        "why_it_matters": "Failing to ask open questions leaves the counterpart's constraints unaddressed.",
                        "alternative_phrasing": "What are the two most critical bottlenecks your department needs resolved before the end of the week?",
                        "reasoning": "This works better because structured discovery uncovers the counterpart's real operational constraints.",
                    },
                    {
                        "moment_seq": q1_seq,
                        "quote": q1_text,
                        "what_happened": "Failure to establish follow-up or commitment.",
                        "why_it_matters": "Ending without a defined next step stalls the relationship and leaves issues unresolved.",
                        "alternative_phrasing": "Let's review the revised operational plan together on Thursday at 2 PM to ensure we are aligned.",
                        "reasoning": "This works better because proposing a concrete time and agenda secures stakeholder buy-in.",
                    },
                ],
                "hidden_reveal": "The counterpart needed structured operational reassurance and proactive problem-solving rather than passive agreement or bare apologies.",
                "success_criteria_results": [
                    {
                        "criterion": "Uncover underlying counterpart objectives",
                        "met": False,
                        "evidence": f"Trainee exited after non-substantive input \"{q1_text}\" without asking discovery questions.",
                    },
                    {
                        "criterion": "Secure clear commitment and next steps",
                        "met": False,
                        "evidence": "Session concluded prematurely without establishing actionable follow-up or commitments.",
                    },
                ],
                "improvement_steps": [
                    {
                        "step": "Engage in at least 4 to 6 substantive conversation exchanges",
                        "why": "Executive problem-solving requires thorough discovery before reaching solutions.",
                        "practice_drill": "Practice complete responses that combine empathy with an open-ended question.",
                        "linked_skill": skills[0] if skills else "discovery_questions",
                    },
                    {
                        "step": "Never reply with an isolated apology or single-word agreement",
                        "why": "A bare apology leaves the counterpart holding the problem with zero confidence in resolution.",
                        "practice_drill": "Pair every apology with a concrete corrective action proposal and a clarifying question.",
                        "linked_skill": skills[1] if len(skills) > 1 else "objection_handling",
                    },
                    {
                        "step": "Lock down concrete next steps and milestones before concluding",
                        "why": "Unscheduled intentions lead to stalled initiatives and lost deals.",
                        "practice_drill": "Propose an exact date, time, and attendee list on your final turn.",
                        "linked_skill": skills[2] if len(skills) > 2 else "closing_next_steps",
                    },
                ],
            }
            return json.dumps(report)

        # Substantive conversation evaluation
        overall_summary = (
            "You maintained executive presence under pushback and focused on aligning expectations and psychological safety. To improve, clarify concrete operational boundaries earlier in the discussion."
            if is_leadership_eval
            else "You stayed calm under pushback and asked clear questions about daily workflow bottlenecks. To improve, pin down their internal approval process earlier instead of waiting until the end."
        )

        report = {
            "overall_summary": overall_summary,
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

        return self._generate_contextual_reply(last_user_message, system_prompt, messages=messages)

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
