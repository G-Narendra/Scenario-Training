from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AuditLogItem(BaseModel):
    id: str
    actor_id: Optional[str] = None
    action: str
    entity: str
    entity_id: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    ip: Optional[str] = None
    created_at: datetime


class AuditLogsResponse(BaseModel):
    items: List[AuditLogItem]
    total: int


class UsageTypeBreakdown(BaseModel):
    type: str  # llm, realtime, audio, etc.
    total_units: int
    total_cost_usd: float


class UsageSummaryResponse(BaseModel):
    total_tokens: int
    total_audio_seconds: float
    total_cost_usd: float
    breakdown_by_type: List[UsageTypeBreakdown]
    recent_events_count: int
