from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, model_validator


class PersonaSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(..., min_length=1, max_length=100)
    personality: List[str] = Field(..., min_length=1)
    communication_style: str = Field(..., min_length=5)
    emotional_baseline: str = Field(default="guarded")


class CurveballSchema(BaseModel):
    trigger: str = Field(..., min_length=3)
    event: str = Field(..., min_length=3)


class SkillAssessedSchema(BaseModel):
    skill: str = Field(..., min_length=2)
    weight: float = Field(..., gt=0.0, le=1.0)


class ConclusionSignalsSchema(BaseModel):
    positive: List[str] = Field(default_factory=list)
    negative: List[str] = Field(default_factory=list)


class ScenarioConfigSchema(BaseModel):
    slug: str = Field(..., min_length=2, max_length=100)
    track: str = Field(..., min_length=2, max_length=50)  # sales or leadership
    title: str = Field(..., min_length=3, max_length=255)
    topic: str = Field(..., min_length=2, max_length=100)
    difficulty: int = Field(..., ge=1, le=5)
    duration_limit_seconds: int = Field(default=600, ge=60, le=3600)
    turn_limit: int = Field(default=30, ge=5, le=100)
    brief: str = Field(..., min_length=10)
    persona: PersonaSchema
    hidden_motivations: List[str] = Field(..., min_length=1)
    objections: List[str] = Field(..., min_length=1)
    curveballs: List[CurveballSchema] = Field(default_factory=list)
    success_criteria: List[str] = Field(..., min_length=1)
    skills_assessed: List[SkillAssessedSchema] = Field(..., min_length=1)
    opening_line: str = Field(..., min_length=3)
    tags: List[str] = Field(default_factory=list)
    conclusion_signals: Optional[ConclusionSignalsSchema] = None

    @model_validator(mode="after")
    def validate_weights(self) -> "ScenarioConfigSchema":
        total_weight = sum(item.weight for item in self.skills_assessed)
        if not (0.98 <= total_weight <= 1.02):
            raise ValueError(
                f"Sum of skills_assessed weights must equal 1.0, got {total_weight:.3f}"
            )
        return self


# Public Trainee Response Schemas (Zero Leakage)
class PersonaPreview(BaseModel):
    name: str
    role: str
    communication_style: Optional[str] = None


class PublicSkillPreview(BaseModel):
    skill: str
    weight: float


class PublicScenarioListItem(BaseModel):
    id: str
    slug: str
    track: str
    title: str
    topic: str
    difficulty: int
    duration_limit_seconds: int
    skills_assessed: List[PublicSkillPreview]
    tags: List[str]


class PublicScenarioDetail(BaseModel):
    id: str
    slug: str
    track: str
    title: str
    topic: str
    difficulty: int
    duration_limit_seconds: int
    turn_limit: int
    brief: str
    persona: PersonaPreview
    opening_line: str
    skills_assessed: List[PublicSkillPreview]
    tags: List[str]


# Admin Response Schemas (Full scenario info)
class AdminScenarioResponse(BaseModel):
    id: str
    track_id: str
    slug: str
    title: str
    status: str
    difficulty: int
    topic: str
    version: int
    duration_limit_seconds: int
    turn_limit: int
    brief: str
    persona: Dict[str, Any]
    hidden_motivations: List[str]
    objections: List[str]
    curveballs: List[Dict[str, Any]]
    success_criteria: List[str]
    skills_assessed: List[Dict[str, Any]]
    opening_line: str
    tags: List[str]
    conclusion_signals: Dict[str, Any]


class ScenarioVersionResponse(BaseModel):
    id: str
    scenario_id: str
    version: int
    snapshot: Dict[str, Any]
    changed_by: Optional[str] = None
    change_note: Optional[str] = None
