from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class SkillAverage(BaseModel):
    skill_key: str
    skill_name: str
    average_score: float = Field(ge=0.0, le=100.0)
    session_count: int = Field(ge=0)


class RecentSessionSummary(BaseModel):
    session_id: str
    scenario_id: str
    scenario_title: str
    track_key: str
    mode: str
    status: str
    score: Optional[int] = None
    completed_at: Optional[datetime] = None
    duration_seconds: int = 0


class RecommendedScenario(BaseModel):
    scenario_id: str
    title: str
    track_key: str
    difficulty: int
    topic: str
    reason: str


class ScoreTrendPoint(BaseModel):
    date: str
    score: int
    scenario_title: str
    session_id: str


class TraineeProgressResponse(BaseModel):
    total_sessions_completed: int
    total_time_seconds: int
    current_streak_days: int
    overall_average_score: float
    skill_averages: List[SkillAverage]
    recent_sessions: List[RecentSessionSummary]
    recommended_scenarios: List[RecommendedScenario]
    score_trends: List[ScoreTrendPoint]


class CohortMemberProgress(BaseModel):
    user_id: str
    display_name: str
    role: str
    sessions_completed: int
    average_score: Optional[float] = None
    last_active_at: Optional[datetime] = None
    top_skill: Optional[str] = None
    needs_work_skill: Optional[str] = None


class MostFailedScenario(BaseModel):
    scenario_id: str
    title: str
    track_key: str
    difficulty: int
    average_score: float
    attempts_count: int
    completion_rate: float


class CohortProgressResponse(BaseModel):
    cohort_id: str
    cohort_name: str
    total_members: int
    active_members: int
    total_sessions_completed: int
    cohort_average_score: float
    skill_score_distribution: List[SkillAverage]
    most_failed_scenarios: List[MostFailedScenario]
    members: List[CohortMemberProgress]
