from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.config import settings
from backend.app.db.models import LoginAttempt


async def check_login_rate_limit(
    session: AsyncSession, ip: str, passcode_prefix: str
) -> tuple[bool, int]:
    """
    Check if IP or passcode prefix is locked out due to repeated failed attempts.
    Returns (is_allowed, retry_after_seconds).
    """
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=settings.LOCKOUT_DURATION_MINUTES)

    # Query failed attempts within lockout window for either IP or passcode prefix
    stmt = select(func.count(LoginAttempt.id)).where(
        and_(
            LoginAttempt.attempted_at >= window_start,
            LoginAttempt.success.is_(False),
            (LoginAttempt.ip == ip) | (LoginAttempt.passcode_prefix == passcode_prefix),
        )
    )
    result = await session.execute(stmt)
    failed_count = result.scalar() or 0

    if failed_count >= settings.MAX_LOGIN_ATTEMPTS:
        # Calculate remaining lockout seconds
        retry_after = settings.LOCKOUT_DURATION_MINUTES * 60
        return False, retry_after

    return True, 0


async def record_login_attempt(
    session: AsyncSession, ip: str, passcode_prefix: str, success: bool
) -> None:
    """Record an audit entry for a login attempt."""
    attempt = LoginAttempt(
        ip=ip,
        passcode_prefix=passcode_prefix,
        attempted_at=datetime.now(timezone.utc),
        success=success,
    )
    session.add(attempt)
    await session.commit()
