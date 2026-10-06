import pytest
from sqlalchemy import text

from backend.app.db.session import async_session_factory, engine


@pytest.mark.asyncio
async def test_database_connection():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT 1"))
        assert result.scalar() == 1


@pytest.mark.asyncio
async def test_session_factory():
    async with async_session_factory() as session:
        result = await session.execute(text("SELECT 42"))
        assert result.scalar() == 42
