import pytest
from sqlalchemy import delete

from backend.app.db.models import (
    AuditLog,
    AuthSession,
    Cohort,
    Evaluation,
    LoginAttempt,
    Message,
    Passcode,
    Scenario,
    ScenarioVersion,
    SimulationSession,
    Skill,
    Track,
    UsageEvent,
    User,
)
from backend.app.db.base import Base
from backend.app.db.session import async_session_factory, engine


@pytest.fixture(autouse=True)
async def clean_test_database():
    """Ensure database schema is created and clean before each test run."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_session_factory() as db:
        await db.execute(delete(UsageEvent))
        await db.execute(delete(Evaluation))
        await db.execute(delete(Message))
        await db.execute(delete(SimulationSession))
        await db.execute(delete(ScenarioVersion))
        await db.execute(delete(Scenario))
        await db.execute(delete(Skill))
        await db.execute(delete(Track))
        await db.execute(delete(LoginAttempt))
        await db.execute(delete(AuthSession))
        await db.execute(delete(User))
        await db.execute(delete(Passcode))
        await db.execute(delete(Cohort))
        await db.execute(delete(AuditLog))
        await db.commit()
    yield
