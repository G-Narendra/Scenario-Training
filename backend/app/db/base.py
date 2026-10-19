from datetime import datetime, timezone

from sqlalchemy import DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def is_expired(dt: datetime) -> bool:
    """Safe datetime expiry comparison for both SQLite (naive) and Postgres (aware)."""
    now = utc_now()
    if dt.tzinfo is None:
        now = now.replace(tzinfo=None)
    elif now.tzinfo is None:
        dt = dt.replace(tzinfo=None)
    return dt < now


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy declarative models."""

    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )
