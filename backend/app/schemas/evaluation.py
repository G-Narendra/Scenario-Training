from typing import List, Optional

from pydantic import BaseModel, Field, model_validator


class SkillScoreItem(BaseModel):
    skill: str = Field(..., description="Skill key name matching scenario rubric")
    score: int = Field(..., ge=1, le=5, description="Integer rating from 1 to 5")
    rubric_level_reached: str = Field(..., description="Description of the rubric level achieved")
    justification: str = Field(..., description="Specific explanation citing dialogue evidence")


class WhatWorkedItem(BaseModel):
    moment_seq: int = Field(..., description="Message sequence number from transcript")
    quote: str = Field(..., description="Verbatim quote spoken by trainee")
    why_it_worked: str = Field(..., description="Reasoning tied to skill and counterpart reaction")


class WhatDidntItem(BaseModel):
    moment_seq: int = Field(..., description="Message sequence number from transcript")
    quote: str = Field(..., description="Verbatim quote spoken by trainee")
    why_it_missed: str = Field(..., description="Reasoning tied to adverse conversational impact")


class KeyMomentItem(BaseModel):
    moment_seq: int = Field(..., description="Message sequence number from transcript")
    quote: str = Field(..., description="Verbatim quote spoken by trainee")
    what_happened: str = Field(..., description="Objective description of interaction")
    why_it_matters: str = Field(..., description="Strategic impact on simulation outcome")
    alternative_phrasing: str = Field(
        ..., description="Concrete, actionable alternative line for the trainee"
    )
    reasoning: str = Field(
        ..., description="Why alternative works better, in the form 'This works better because...'"
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
    met: bool = Field(..., description="Whether trainee satisfied this criterion")
    evidence: str = Field(..., description="Dialogue citation or rationale")


class ImprovementStepItem(BaseModel):
    step: str = Field(..., description="Short imperative action step")
    why: str = Field(..., description="Strategic rationale")
    practice_drill: str = Field(..., description="Specific concrete practice exercise")
    linked_skill: str = Field(..., description="Associated skill key")


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
        ..., min_length=3, description="At least 3 pivotal moments analyzed in detail"
    )
    hidden_reveal: str = Field(
        ..., description="What counterpart was really thinking or motivated by"
    )
    success_criteria_results: List[SuccessCriteriaResultItem] = Field(
        ..., description="Evaluation against scenario goals"
    )
    improvement_steps: List[ImprovementStepItem] = Field(
        ..., min_length=3, max_length=4, description="Exactly 3 to 4 concrete improvement steps"
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
