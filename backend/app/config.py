from typing import Any, List, Optional, Union

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = Field(default="development")
    DEBUG: bool = Field(default=False)
    APP_NAME: str = Field(default="ScenarioLab: Workplace Scenario Training")
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
    DEFAULT_LLM_PROVIDER: str = Field(default="nvidia")
    LLM_PROVIDER: str = Field(default="nvidia")
    NVIDIA_API_KEY: Optional[str] = Field(default="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")
    NVIDIA_API_KEYS: Union[List[str], str] = Field(
        default=[
            "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",
            "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",
            "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",
            "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",
        ]
    )

    @field_validator("NVIDIA_API_KEYS", mode="before")
    @classmethod
    def parse_nvidia_api_keys(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            if v.strip().startswith("[") and v.strip().endswith("]"):
                try:
                    import json
                    return json.loads(v)
                except Exception:
                    pass
            return [k.strip() for k in v.split(",") if k.strip()]
        if isinstance(v, (list, tuple)):
            return [str(k).strip() for k in v if str(k).strip()]
        return []

    NVIDIA_BASE_URL: str = Field(default="https://integrate.api.nvidia.com/v1/chat/completions")
    NVIDIA_MODEL: str = Field(default="meta/llama-3.2-11b-vision-instruct")
    ANTHROPIC_API_KEY: Optional[str] = Field(default=None)
    OPENAI_API_KEY: Optional[str] = Field(default=None)
    DEFAULT_VOICE_PROVIDER: str = Field(default="mock")
    VOICE_PROVIDER: str = Field(default="mock")
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
