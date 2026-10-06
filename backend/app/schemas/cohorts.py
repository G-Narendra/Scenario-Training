from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CreateCohortRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    duration_days: int = Field(default=30, ge=1, le=365)
    track_access: str = Field(default="both")  # sales, leadership, both
    max_members: int = Field(default=50, ge=1)
    budget_cap_usd: float = Field(default=100.0, ge=0.0)


class CohortResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    starts_at: datetime
    expires_at: datetime
    is_active: bool
    max_members: int
    budget_cap_usd: float
    track_access: str
    initial_passcode: Optional[str] = None


class RotatePasscodeRequest(BaseModel):
    label: Optional[str] = None
    grace_period_minutes: int = Field(default=0, ge=0)


class RotatePasscodeResponse(BaseModel):
    cohort_id: str
    new_passcode: str
    valid_until: Optional[datetime] = None
    grace_period_minutes: int


class ExtendCohortRequest(BaseModel):
    additional_days: int = Field(..., ge=1, le=365)
