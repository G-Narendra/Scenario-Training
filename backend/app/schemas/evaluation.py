from typing import List, Optional

from pydantic import BaseModel, Field, model_validator


class SkillScoreItem(BaseModel):
    skill: str = Field(..., description="Skill key name matching scenario rubric")
    score: int = Field(..., ge=1, le=5, description="Integer rating from 1 to 5")
    rubric_level_reached: str = Field(..., description="Description of the rubric level achieved")
    justification: str = Field(..., description="Specific explanation citing dialogue evidence")


class WhatWorkedItem(BaseModel):
    moment_seq: int = Field(default=1, description="Message sequence number from transcript")
    quote: str = Field(default="", description="Verbatim quote spoken by trainee")
    why_it_worked: str = Field(default="Maintained professional tone and engaged constructively.", description="Reasoning tied to skill and counterpart reaction")


class WhatDidntItem(BaseModel):
    moment_seq: int = Field(default=1, description="Message sequence number from transcript")
    quote: str = Field(default="", description="Verbatim quote spoken by trainee")
    why_it_missed: str = Field(default="Opportunity to explore underlying requirements more deeply.", description="Reasoning tied to adverse conversational impact")


class KeyMomentItem(BaseModel):
    moment_seq: int = Field(default=1, description="Message sequence number from transcript")
    quote: str = Field(default="", description="Verbatim quote spoken by trainee")
    what_happened: str = Field(default="Pivotal conversational exchange.", description="Objective description of interaction")
    why_it_matters: str = Field(default="Strategic impact on simulation outcome.", description="Strategic impact on simulation outcome")
    alternative_phrasing: str = Field(
        default="I understand your position. Can you walk me through the key constraints?",
        description="Concrete, actionable alternative line for the trainee"
    )
    reasoning: str = Field(
        default="This works better because open discovery aligns mutual priorities.",
        description="Why alternative works better, in the form 'This works better because...'"
    )

    @model_validator(mode="after")
    def validate_reasoning_format(self):
        # Master prompt rule: "Always explain WHY, in the form 'this works better because...'"
        lower = self.reasoning.lower()
        if "because" not in lower:
            self.reasoning = f"This works better because {self.reasoning}"
        return self


class SuccessCriteriaResultItem(BaseModel):
    criterion: str = Field(..., description="Scenario success criterion")
    met: bool = Field(default=True, description="Whether trainee satisfied this criterion")
    evidence: str = Field(default="Assessed from conversational dialogue.", description="Dialogue citation or rationale")


class ImprovementStepItem(BaseModel):
    step: str = Field(..., description="Short imperative action step")
    why: str = Field(default="Reinforces structured conversational alignment.", description="Strategic rationale")
    practice_drill: str = Field(default="Practice active listening before responding.", description="Specific concrete practice exercise")
    linked_skill: str = Field(default="active_listening", description="Associated skill key")


class FeedbackReportSchema(BaseModel):
    overall_summary: str = Field(..., description="2-4 sentences specific to this conversation")
    skill_scores: List[SkillScoreItem] = Field(
        ..., min_length=1, description="Scores for assessed skills"
    )
    what_worked: List[WhatWorkedItem] = Field(
        ..., min_length=1, description="Strengths observed with transcript quotes"
    )
    what_didnt: List[WhatDidntItem] = Field(
        ..., min_length=1, description="Opportunities for growth with transcript quotes"
    )
    key_moments: List[KeyMomentItem] = Field(
        default_factory=list, min_length=1, description="Pivotal moments analyzed in detail"
    )
    hidden_reveal: str = Field(
        ..., description="What counterpart was really thinking or motivated by"
    )
    success_criteria_results: List[SuccessCriteriaResultItem] = Field(
        default_factory=list, description="Evaluation against scenario goals"
    )
    improvement_steps: List[ImprovementStepItem] = Field(
        default_factory=list, min_length=1, max_length=6, description="Targeted improvement steps"
    )
    overall_score: Optional[int] = Field(
        None,
        ge=0,
        le=100,
        description="Deterministic overall score 0-100 computed from weighted skill scores",
    )
    is_fallback: bool = Field(
        False,
        description="Flag set if report was generated via deterministic fallback after repair retries",
    )
    stage_timing_ms: Optional[dict] = Field(
        default_factory=dict,
        description="Detailed latency breakdown across database, AI evaluator, quote verification, and commit stages in milliseconds",
    )
