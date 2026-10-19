from typing import Any, AsyncGenerator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.app.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

if "asyncpg" in db_url:
    db_url = db_url.replace("sslmode=require", "ssl=require")
    db_url = db_url.replace("channel_binding=require&", "")
    db_url = db_url.replace("&channel_binding=require", "")
    db_url = db_url.replace("?channel_binding=require", "?")

# Engine configuration
engine_kwargs: dict[str, Any] = {
    "echo": settings.DEBUG,
    "future": True,
}
if "sqlite" in db_url:
    engine_kwargs["connect_args"] = {
        "check_same_thread": False,
        "timeout": 60,
    }
else:
    # Production connection pool tuned for concurrency, failover resilience & zero stale socket drops
    engine_kwargs.update({
        "pool_size": 20,
        "max_overflow": 10,
        "pool_timeout": 30,
        "pool_recycle": 1800,
        "pool_pre_ping": True,
    })

engine = create_async_engine(db_url, **engine_kwargs)

if "sqlite" in settings.DATABASE_URL:
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=60000")
        cursor.close()

async_session_factory = async_sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False, autocommit=False, autoflush=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides a transactional async database session."""
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()
