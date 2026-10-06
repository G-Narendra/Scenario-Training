from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = Field(default="development")
    DEBUG: bool = Field(default=False)
    APP_NAME: str = Field(default="Flight Simulator for Difficult Conversations")
    APP_VERSION: str = Field(default="1.0.0")
    HOST: str = Field(default="127.0.0.1")
    PORT: int = Field(default=8000)

    # Security & Auth
    SECRET_KEY: str = Field(default="dev-scenario-training-secret-key-32chars-minimum-safe")
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=720)
    DEFAULT_COHORT_DURATION_DAYS: int = Field(default=30)
    MAX_LOGIN_ATTEMPTS: int = Field(default=5)
    LOCKOUT_DURATION_MINUTES: int = Field(default=15)

    # Database
    DATABASE_URL: str = Field(default="sqlite+aiosqlite:///./data.db")

    # AI & Voice Providers
    DEFAULT_LLM_PROVIDER: str = Field(default="mock")
    ANTHROPIC_API_KEY: Optional[str] = Field(default=None)
    OPENAI_API_KEY: Optional[str] = Field(default=None)
    DEFAULT_VOICE_PROVIDER: str = Field(default="mock")
    RUN_LIVE_TESTS: int = Field(default=0)

    # CORS
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
    )

    # Budget & Cost Limits
    DEFAULT_COHORT_BUDGET_CAP_USD: float = Field(default=100.0)
    SESSION_TOKEN_LIMIT: int = Field(default=4000)
    SESSION_AUDIO_MINUTES_LIMIT: float = Field(default=15.0)

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
