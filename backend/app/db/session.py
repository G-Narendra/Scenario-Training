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
    # Automatically route Neon database connections to high-concurrency PgBouncer pooler
    if ".neon.tech" in db_url and "-pooler." not in db_url:
        import re
        db_url = re.sub(r"(ep-[a-zA-Z0-9-]+)(\.c-[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.neon\.tech)", r"\1-pooler\2", db_url)

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
    # High-concurrency production connection pool with PgBouncer compatibility
    engine_kwargs.update({
        "pool_size": 30,
        "max_overflow": 50,
        "pool_timeout": 45.0,
        "pool_recycle": 300,
        "pool_pre_ping": True,
        "connect_args": {
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
        },
    })

engine = create_async_engine(db_url, **engine_kwargs)

if "sqlite" in db_url:
    import os
    db_file = db_url.split("///")[-1].split("?")[0]
    db_dir = os.path.dirname(db_file)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

if "sqlite" in settings.DATABASE_URL:
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
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
