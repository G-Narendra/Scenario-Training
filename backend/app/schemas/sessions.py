from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class CreateSessionRequest(BaseModel):
    scenario_id: str = Field(..., description="ID of the published scenario")
    mode: str = Field(default="text", pattern="^(text|voice)$")


class SessionMessageResponse(BaseModel):
    seq: int
    role: str  # trainee, counterpart, system
    content: str
    latency_ms: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)


class SessionDetailResponse(BaseModel):
    id: str
    scenario_id: str
    scenario_title: str
    mode: str
    status: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    end_reason: Optional[str] = None
    token_usage: int = 0
    turn_count: int = 0
    messages: List[SessionMessageResponse] = []

    class Config:
        from_attributes = True


class SessionListItemResponse(BaseModel):
    id: str
    scenario_id: str
    scenario_title: str
    mode: str
    status: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    turn_count: int = 0
    overall_score: Optional[int] = None

    class Config:
        from_attributes = True
