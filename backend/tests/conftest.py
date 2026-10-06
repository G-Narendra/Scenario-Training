import pytest
from sqlalchemy import delete

from backend.app.db.models import AuditLog, AuthSession, Cohort, LoginAttempt, Passcode, User
from backend.app.db.session import async_session_factory


@pytest.fixture(autouse=True)
async def clean_test_database():
    """Ensure clean database state before each test run."""
    async with async_session_factory() as db:
        await db.execute(delete(LoginAttempt))
        await db.execute(delete(AuthSession))
        await db.execute(delete(User))
        await db.execute(delete(Passcode))
        await db.execute(delete(Cohort))
        await db.execute(delete(AuditLog))
        await db.commit()
    yield
