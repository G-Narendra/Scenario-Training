from backend.app.config import Settings


def test_settings_defaults():
    s = Settings()
    assert s.APP_VERSION == "1.0.0"
    assert s.DEFAULT_COHORT_DURATION_DAYS == 30
    assert s.DEFAULT_LLM_PROVIDER in ["mock", "anthropic", "openai"]
    assert s.ACCESS_TOKEN_EXPIRE_MINUTES == 720
    assert s.MAX_LOGIN_ATTEMPTS == 5
