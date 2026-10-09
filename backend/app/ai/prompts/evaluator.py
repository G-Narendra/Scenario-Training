import json
from typing import Any, Dict, List

EVALUATOR_SYSTEM_PROMPT = """You are an elite executive communications coach and scenario-training evaluator for high-stakes interpersonal conversations.

Your task is to thoroughly analyze a simulation transcript between a human trainee and a simulated counterpart.
You will evaluate the trainee's performance against the scenario's success criteria and skill rubrics, and provide structured, highly actionable feedback.

CRITICAL EVALUATION RULES:
1. Objectivity: Base every score and judgment on concrete transcript evidence. Never offer generic praise ("great job") or vague criticism ("could be better") without referencing specific turns.
2. Quoting Accuracy: Every quoted remark for `what_worked`, `what_didnt`, and `key_moments` MUST BE VERBATIM text actually spoken by the trainee in the transcript. Do NOT invent, paraphrase, or hallucinate quotes.
3. Natural Human Writing (Wikipedia Style Guidelines):
   - NO PROMOTIONAL PUFFERY: Strip out peacock terms like 'robust', 'groundbreaking', 'vibrant', 'transformative', 'breathtaking', or 'seamless'.
   - NO VAGUE ATTRIBUTION: Do not use 'studies show' or 'experts say'. Cite specific operational facts or transcript turns.
   - NO FORMULAIC LISTS: Avoid rule-of-three triplets ('X, Y, and Z').
   - SIMPLIFY SYNTAX: Use plain verbs (is, has, wrote, asked) instead of jargon (utilizes, leverages, facilitates).
   - NO META-COMMENTARY: Eliminate filler phrases like 'it is important to note', 'in conclusion', or assistant sign-offs.
4. Constructive Tone: Tone must be constructive, respectful, and direct.
5. "Why" Explanations: For every alternative phrasing in `key_moments`, you must explain why it is superior using the pattern "This works better because [principle and counterpart psychological effect]".
6. Key Moments: You must identify at least 3 pivotal moments where the trainee's choice significantly steered the conversation.
7. Hidden Motivation Reveal: Disclose what the counterpart was actually thinking and whether the trainee managed to uncover or navigate it.
8. Improvement Steps: Provide EXACTLY 3 or 4 concrete, actionable drills/steps.
9. Output Format: Return ONLY a valid JSON object matching the requested schema. No markdown wraps, no extra commentary.
"""


def build_evaluator_prompt(
    scenario_data: Dict[str, Any],
    skills_with_rubrics: List[Dict[str, Any]],
    transcript_messages: List[Dict[str, Any]],
) -> str:
    """Composes the full user prompt for the evaluation engine."""
    # 1. Format Scenario Context
    context_lines = [
        f"### SCENARIO: {scenario_data.get('title')}",
        f"**Brief**: {scenario_data.get('brief')}",
        f"**Counterpart Persona**: {scenario_data.get('persona', {}).get('name')} ({scenario_data.get('persona', {}).get('role')})",
        f"**Communication Style**: {scenario_data.get('persona', {}).get('communication_style')}",
        "**Hidden Motivations of Counterpart** (Confidential):",
    ]
    for m in scenario_data.get("hidden_motivations", []):
        context_lines.append(f"- {m}")

    context_lines.append("\n**Scenario Success Criteria**:")
    for sc in scenario_data.get("success_criteria", []):
        context_lines.append(f"- {sc}")

    # 2. Format Assessed Skills and Rubrics
    context_lines.append("\n### SKILLS AND RUBRICS (Score 1 to 5):")
    for s in skills_with_rubrics:
        context_lines.append(f"\n* Skill: **{s.get('key')}** ({s.get('name')})")
        context_lines.append(f"  Description: {s.get('description', '')}")
        rubric = s.get("rubric", {})
        if rubric:
            context_lines.append("  Rubric Levels:")
            for level in range(1, 6):
                str_lvl = str(level)
                if str_lvl in rubric:
                    context_lines.append(f"    - Level {level}: {rubric[str_lvl]}")

    # 3. Format Transcript
    context_lines.append("\n### TRANSCRIPT OF SIMULATION:")
    for msg in transcript_messages:
        seq = msg.get("seq")
        role = msg.get("role", "unknown").upper()
        content = msg.get("content", "").strip()
        context_lines.append(f"[Turn {seq}] {role}: {content}")

    # 4. Format Output Schema Instructions
    context_lines.append("\n### REQUIRED JSON RESPONSE STRUCTURE:")
    sample_format = {
        "overall_summary": "2 to 4 sentences providing a holistic assessment of conversational dynamics.",
        "skill_scores": [
            {
                "skill": "skill_key_name",
                "score": 3,
                "rubric_level_reached": "Quote matching rubric descriptor",
                "justification": "Detailed citation from transcript explaining score",
            }
        ],
        "what_worked": [
            {
                "moment_seq": 4,
                "quote": "verbatim words spoken by trainee",
                "why_it_worked": "Impact on counterpart and conversational momentum",
            }
        ],
        "what_didnt": [
            {
                "moment_seq": 6,
                "quote": "verbatim words spoken by trainee",
                "why_it_missed": "Specific negative consequence or missed opportunity",
            }
        ],
        "key_moments": [
            {
                "moment_seq": 6,
                "quote": "verbatim words spoken by trainee",
                "what_happened": "Objective analysis of the exchange",
                "why_it_matters": "Strategic significance to the simulation outcome",
                "alternative_phrasing": "Specific recommended statement the trainee should say",
                "reasoning": "This works better because [psychological/tactical rationale]",
            }
        ],
        "hidden_reveal": "Explanation of counterpart's inner driver and how the trainee handled it.",
        "success_criteria_results": [
            {"criterion": "Success criterion text", "met": True, "evidence": "Transcript citation"}
        ],
        "improvement_steps": [
            {
                "step": "Imperative action directive",
                "why": "Tactical rationale",
                "practice_drill": "Concrete simulation exercise or phrasing drill",
                "linked_skill": "skill_key_name",
            }
        ],
    }
    context_lines.append(json.dumps(sample_format, indent=2))
    context_lines.append("\nProduce valid JSON strictly adhering to this structure.")

    return "\n".join(context_lines)


def build_repair_prompt(
    original_output: str,
    validation_errors: List[str],
    trainee_quotes_available: List[Dict[str, Any]],
) -> str:
    """Builds a repair prompt highlighting schema or verbatim quote validation errors."""
    error_list = "\n".join([f"- {err}" for err in validation_errors])
    valid_quotes_sample = "\n".join(
        [f"- Turn {q.get('seq')}: \"{q.get('content')}\"" for q in trainee_quotes_available]
    )

    return f"""The previous JSON response contained validation errors. Please correct the JSON and return the fixed object.

ERRORS DETECTED:
{error_list}

ALLOWED TRAINEE TURNS FOR VERBATIM QUOTES:
{valid_quotes_sample}

CRITICAL RULES:
1. Ensure all quotes match one of the trainee turns above VERBATIM.
2. Ensure improvement_steps contains exactly 3 or 4 items.
3. Ensure at least 3 key_moments are provided.
4. Return ONLY valid JSON with no markdown wrapping.
"""
