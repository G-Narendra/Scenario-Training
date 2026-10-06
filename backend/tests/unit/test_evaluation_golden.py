from backend.app.schemas.evaluation import (
    FeedbackReportSchema,
    SkillScoreItem,
)
from backend.app.services.scoring_service import ScoringService

GOLDEN_TRANSCRIPTS = {
    "sales_good": [
        {
            "seq": 1,
            "role": "counterpart",
            "content": "Thanks for jumping on. I'll be direct: we have a cheaper offer on the table.",
        },
        {
            "seq": 2,
            "role": "trainee",
            "content": "Thanks Dana. Before we discuss price, could you share Northwind's core strategic priorities and cost targets for this quarter?",
        },
        {
            "seq": 3,
            "role": "counterpart",
            "content": "Our CFO mandated a 10% operational budget cut, though we appreciate your support uptime.",
        },
        {
            "seq": 4,
            "role": "trainee",
            "content": "I completely understand the CFO cost-cut mandate. Let's look at how our automation offsets overhead so you hit that 10% without sacrificing reliability.",
        },
        {
            "seq": 5,
            "role": "counterpart",
            "content": "If you can prove that to finance, I am open to reviewing the numbers.",
        },
        {
            "seq": 6,
            "role": "trainee",
            "content": "Excellent. Let's put 30 minutes on the calendar for next Thursday at 2 PM to walk through the ROI breakdown together.",
        },
    ],
    "sales_mediocre": [
        {
            "seq": 1,
            "role": "counterpart",
            "content": "Thanks for jumping on. I'll be direct: we have a cheaper offer on the table.",
        },
        {
            "seq": 2,
            "role": "trainee",
            "content": "We can probably give you a 10% discount if you sign today.",
        },
        {"seq": 3, "role": "counterpart", "content": "Only 10%? The competitor is 20% cheaper."},
        {
            "seq": 4,
            "role": "trainee",
            "content": "Well our product is better. Just let me know if you want to renew.",
        },
    ],
    "sales_poor": [
        {
            "seq": 1,
            "role": "counterpart",
            "content": "Thanks for jumping on. I'll be direct: we have a cheaper offer on the table.",
        },
        {
            "seq": 2,
            "role": "trainee",
            "content": "You always complain about price, but you wouldn't survive without our software.",
        },
        {
            "seq": 3,
            "role": "counterpart",
            "content": "Excuse me? That is completely unprofessional. We are terminating discussions.",
        },
        {
            "seq": 4,
            "role": "trainee",
            "content": "Go ahead, good luck with the competitor's downtime.",
        },
    ],
    "leadership_good": [
        {
            "seq": 1,
            "role": "counterpart",
            "content": "Did you want to talk about my project deliverables?",
        },
        {
            "seq": 2,
            "role": "trainee",
            "content": "Yes Marcus. I noticed the inventory module was submitted two days late for the sprint demo. What roadblocks did you encounter?",
        },
        {
            "seq": 3,
            "role": "counterpart",
            "content": "The backend API specs were delayed and I didn't want to raise a false alarm.",
        },
        {
            "seq": 4,
            "role": "trainee",
            "content": "I appreciate you taking ownership of the quality, Marcus. Going forward, when dependencies slip, raise it immediately during standup so we can rebalance resources.",
        },
        {
            "seq": 5,
            "role": "counterpart",
            "content": "Understood. I will flag blocker tickets the morning they occur.",
        },
        {
            "seq": 6,
            "role": "trainee",
            "content": "Great commitment. Let's review in our 1-on-1 next Tuesday.",
        },
    ],
    "leadership_mediocre": [
        {
            "seq": 1,
            "role": "counterpart",
            "content": "Did you want to talk about my project deliverables?",
        },
        {"seq": 2, "role": "trainee", "content": "You need to be faster. Things are slipping."},
        {"seq": 3, "role": "counterpart", "content": "Other teams delayed me."},
        {"seq": 4, "role": "trainee", "content": "Just try harder to meet deadlines."},
    ],
    "leadership_poor": [
        {
            "seq": 1,
            "role": "counterpart",
            "content": "Did you want to talk about my project deliverables?",
        },
        {
            "seq": 2,
            "role": "trainee",
            "content": "You are the bottleneck on this team and everyone knows it.",
        },
        {"seq": 3, "role": "counterpart", "content": "That is an unfair personal attack."},
        {
            "seq": 4,
            "role": "trainee",
            "content": "Fix your attitude or I will find someone who can.",
        },
    ],
}


def test_deterministic_scoring_math():
    """Verify deterministic scoring formula: overall = round(sum(weight * (score - 1) / 4) * 100)."""
    skills_assessed = [
        {"skill": "discovery_questions", "weight": 0.4},
        {"skill": "objection_handling", "weight": 0.3},
        {"skill": "value_articulation", "weight": 0.2},
        {"skill": "closing_next_steps", "weight": 0.1},
    ]

    # Perfect scores: all 5 -> overall should be 100
    perfect_scores = [
        SkillScoreItem(
            skill="discovery_questions",
            score=5,
            rubric_level_reached="L5",
            justification="Excellent",
        ),
        SkillScoreItem(
            skill="objection_handling",
            score=5,
            rubric_level_reached="L5",
            justification="Excellent",
        ),
        SkillScoreItem(
            skill="value_articulation",
            score=5,
            rubric_level_reached="L5",
            justification="Excellent",
        ),
        SkillScoreItem(
            skill="closing_next_steps",
            score=5,
            rubric_level_reached="L5",
            justification="Excellent",
        ),
    ]
    assert (
        ScoringService.compute_deterministic_overall_score(perfect_scores, skills_assessed) == 100
    )

    # Lowest scores: all 1 -> overall should be 0
    lowest_scores = [
        SkillScoreItem(
            skill="discovery_questions", score=1, rubric_level_reached="L1", justification="Poor"
        ),
        SkillScoreItem(
            skill="objection_handling", score=1, rubric_level_reached="L1", justification="Poor"
        ),
        SkillScoreItem(
            skill="value_articulation", score=1, rubric_level_reached="L1", justification="Poor"
        ),
        SkillScoreItem(
            skill="closing_next_steps", score=1, rubric_level_reached="L1", justification="Poor"
        ),
    ]
    assert ScoringService.compute_deterministic_overall_score(lowest_scores, skills_assessed) == 0

    # Mid scores: all 3 -> overall should be round((2/4)*100) = 50
    mid_scores = [
        SkillScoreItem(
            skill="discovery_questions", score=3, rubric_level_reached="L3", justification="Fair"
        ),
        SkillScoreItem(
            skill="objection_handling", score=3, rubric_level_reached="L3", justification="Fair"
        ),
        SkillScoreItem(
            skill="value_articulation", score=3, rubric_level_reached="L3", justification="Fair"
        ),
        SkillScoreItem(
            skill="closing_next_steps", score=3, rubric_level_reached="L3", justification="Fair"
        ),
    ]
    assert ScoringService.compute_deterministic_overall_score(mid_scores, skills_assessed) == 50


def test_golden_transcript_score_ordering():
    """Assert strict consistency ordering: good > mediocre > poor for sales and leadership tracks."""
    sales_weights = [
        {"skill": "discovery_questions", "weight": 0.3},
        {"skill": "objection_handling", "weight": 0.3},
        {"skill": "value_articulation", "weight": 0.2},
        {"skill": "closing_next_steps", "weight": 0.2},
    ]

    good_eval = [
        SkillScoreItem(
            skill="discovery_questions",
            score=5,
            rubric_level_reached="L5",
            justification="Uncovered budget",
        ),
        SkillScoreItem(
            skill="objection_handling",
            score=5,
            rubric_level_reached="L5",
            justification="Reframed without discount",
        ),
        SkillScoreItem(
            skill="value_articulation",
            score=4,
            rubric_level_reached="L4",
            justification="Articulated automation savings",
        ),
        SkillScoreItem(
            skill="closing_next_steps",
            score=5,
            rubric_level_reached="L5",
            justification="Secured Thursday meeting",
        ),
    ]

    mediocre_eval = [
        SkillScoreItem(
            skill="discovery_questions",
            score=2,
            rubric_level_reached="L2",
            justification="No discovery",
        ),
        SkillScoreItem(
            skill="objection_handling",
            score=2,
            rubric_level_reached="L2",
            justification="Immediate discount",
        ),
        SkillScoreItem(
            skill="value_articulation",
            score=3,
            rubric_level_reached="L3",
            justification="Generic claim",
        ),
        SkillScoreItem(
            skill="closing_next_steps",
            score=2,
            rubric_level_reached="L2",
            justification="Vague closing",
        ),
    ]

    poor_eval = [
        SkillScoreItem(
            skill="discovery_questions", score=1, rubric_level_reached="L1", justification="Hostile"
        ),
        SkillScoreItem(
            skill="objection_handling",
            score=1,
            rubric_level_reached="L1",
            justification="Defensive",
        ),
        SkillScoreItem(
            skill="value_articulation",
            score=1,
            rubric_level_reached="L1",
            justification="Insulting",
        ),
        SkillScoreItem(
            skill="closing_next_steps",
            score=1,
            rubric_level_reached="L1",
            justification="Ended call",
        ),
    ]

    good_score = ScoringService.compute_deterministic_overall_score(good_eval, sales_weights)
    med_score = ScoringService.compute_deterministic_overall_score(mediocre_eval, sales_weights)
    poor_score = ScoringService.compute_deterministic_overall_score(poor_eval, sales_weights)

    assert good_score > med_score > poor_score
    assert good_score >= 85
    assert 20 <= med_score <= 50
    assert poor_score <= 15


def test_verbatim_quote_validation():
    """Verify that quote validator enforces exact trainee quotes from the conversation."""
    trainee_messages = [
        {
            "seq": 2,
            "content": "Thanks Dana. Before we discuss price, could you share Northwind's core strategic priorities?",
        },
        {"seq": 4, "content": "I completely understand the CFO cost-cut mandate."},
        {"seq": 6, "content": "Let's put 30 minutes on the calendar for next Thursday at 2 PM."},
    ]

    valid_report = {
        "what_worked": [
            {"moment_seq": 2, "quote": "could you share Northwind's core strategic priorities?"}
        ],
        "what_didnt": [
            {"moment_seq": 4, "quote": "I completely understand the CFO cost-cut mandate."}
        ],
        "key_moments": [
            {"moment_seq": 2, "quote": "Before we discuss price"},
            {"moment_seq": 4, "quote": "CFO cost-cut mandate"},
            {"moment_seq": 6, "quote": "Let's put 30 minutes on the calendar"},
        ],
    }

    errors = ScoringService.validate_verbatim_quotes(valid_report, trainee_messages)
    assert len(errors) == 0, f"Expected 0 errors, got: {errors}"

    # Invalid hallucinated quote
    invalid_report = {
        "what_worked": [{"moment_seq": 2, "quote": "This was never said anywhere by the trainee!"}],
        "what_didnt": [],
        "key_moments": [],
    }
    errors = ScoringService.validate_verbatim_quotes(invalid_report, trainee_messages)
    assert len(errors) > 0
    assert "was not found verbatim" in errors[0]


def test_strict_schema_structure():
    """Verify FeedbackReportSchema enforces min/max constraints and formatting."""
    report_dict = {
        "overall_summary": "The trainee demonstrated solid performance during the conversation.",
        "skill_scores": [
            {
                "skill": "discovery_questions",
                "score": 4,
                "rubric_level_reached": "Level 4 demonstrated",
                "justification": "Asked strategic discovery questions early",
            }
        ],
        "what_worked": [
            {
                "moment_seq": 2,
                "quote": "Could you share what your top priorities are?",
                "why_it_worked": "Engaged counterpart respectfully",
            }
        ],
        "what_didnt": [
            {
                "moment_seq": 4,
                "quote": "We can offer a discount.",
                "why_it_missed": "Gave concession too early",
            }
        ],
        "key_moments": [
            {
                "moment_seq": 2,
                "quote": "Could you share what your top priorities are?",
                "what_happened": "Discovery inquiry",
                "why_it_matters": "Uncovered budget constraints",
                "alternative_phrasing": "What are your team's top benchmarks for this year?",
                "reasoning": "This works better because open questions reveal motivations.",
            },
            {
                "moment_seq": 4,
                "quote": "We can offer a discount.",
                "what_happened": "Price objection handling",
                "why_it_matters": "Determined profit margin and value",
                "alternative_phrasing": "Help me understand the CFO target before we discuss pricing.",
                "reasoning": "This works better because it frames around total value.",
            },
            {
                "moment_seq": 6,
                "quote": "Let's meet Thursday.",
                "what_happened": "Call closing",
                "why_it_matters": "Secured commitment",
                "alternative_phrasing": "Let's put 30 minutes on the calendar next Thursday.",
                "reasoning": "This works better because specific scheduling prevents drop-off.",
            },
        ],
        "hidden_reveal": "Counterpart had a 10% cost cut mandate from the CFO.",
        "success_criteria_results": [
            {"criterion": "Uncover cost cut target", "met": True, "evidence": "Mentioned at turn 3"}
        ],
        "improvement_steps": [
            {
                "step": "Ask open questions early",
                "why": "Uncovers hidden drivers",
                "practice_drill": "Practice 3 opening turns with TED questions",
                "linked_skill": "discovery_questions",
            },
            {
                "step": "Validate objections before offering solutions",
                "why": "Lowers resistance",
                "practice_drill": "Mirror counterpart emotion before explaining features",
                "linked_skill": "objection_handling",
            },
            {
                "step": "Lock down firm next steps",
                "why": "Maintains pipeline momentum",
                "practice_drill": "End every conversation with specific calendar invite",
                "linked_skill": "closing_next_steps",
            },
        ],
    }

    schema = FeedbackReportSchema(**report_dict)
    assert len(schema.improvement_steps) == 3
    assert len(schema.key_moments) == 3
    assert schema.key_moments[0].reasoning.startswith("This works better because")
