from typing import Optional

from pydantic import BaseModel, Field


class PasscodeLoginRequest(BaseModel):
    passcode: str = Field(
        ..., min_length=4, max_length=50, description="Cohort or individual passcode"
    )
    display_name: str = Field(
        ..., min_length=1, max_length=100, description="Trainee or admin display name"
    )


class UserResponse(BaseModel):
    id: str
    display_name: str
    role: str
    cohort_id: Optional[str] = None
    email: Optional[str] = None


class CohortSummary(BaseModel):
    id: str
    name: str
    expires_at: str
    track_access: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: str
    user: UserResponse
    cohort: Optional[CohortSummary] = None
