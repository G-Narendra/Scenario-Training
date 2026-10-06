from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import and_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.models import AuditLog, AuthSession, Cohort, Passcode, User
from backend.app.security.passcodes import (
    generate_passcode,
    hash_passcode,
    hash_token,
    normalize_passcode,
    verify_passcode,
)
from backend.app.security.rate_limit import check_login_rate_limit, record_login_attempt
from backend.app.security.tokens import create_access_token


class AccessService:
    @staticmethod
    async def create_cohort(
        db: AsyncSession,
        name: str,
        description: Optional[str] = None,
        duration_days: int = 30,
        track_access: str = "both",
        max_members: int = 50,
        budget_cap_usd: float = 100.0,
        actor_id: Optional[str] = None,
        ip: Optional[str] = None,
    ) -> Tuple[Cohort, str]:
        """Create a new cohort with a hard 30-day window and initial passcode."""
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=duration_days)

        cohort = Cohort(
            name=name,
            description=description,
            starts_at=now,
            expires_at=expires_at,
            track_access=track_access,
            max_members=max_members,
            budget_cap_usd=budget_cap_usd,
            is_active=True,
        )
        db.add(cohort)
        await db.flush()

        # Generate initial passcode
        plain_code = generate_passcode()
        passcode = Passcode(
            cohort_id=cohort.id,
            code_hash=hash_passcode(plain_code),
            label="Initial Passcode",
            valid_from=now,
            valid_until=expires_at,
            uses_count=0,
        )
        db.add(passcode)

        # Audit log
        audit = AuditLog(
            actor_id=actor_id,
            action="CREATE_COHORT",
            entity="Cohort",
            entity_id=cohort.id,
            details={"name": name, "duration_days": duration_days, "track_access": track_access},
            ip=ip,
        )
        db.add(audit)
        await db.commit()
        await db.refresh(cohort)

        return cohort, plain_code

    @staticmethod
    async def rotate_passcode(
        db: AsyncSession,
        cohort_id: str,
        label: Optional[str] = None,
        grace_period_minutes: int = 0,
        actor_id: Optional[str] = None,
        ip: Optional[str] = None,
    ) -> Tuple[Passcode, str]:
        """Rotate cohort passcode, invalidating previous codes after grace period."""
        now = datetime.now(timezone.utc)
        cohort = await db.get(Cohort, cohort_id)
        if not cohort:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cohort not found")

        # Find existing active passcodes
        stmt = select(Passcode).where(
            and_(Passcode.cohort_id == cohort_id, Passcode.revoked_at.is_(None))
        )
        existing_codes = (await db.execute(stmt)).scalars().all()

        last_code_id = None
        for code in existing_codes:
            last_code_id = code.id
            if grace_period_minutes > 0:
                code.valid_until = now + timedelta(minutes=grace_period_minutes)
            else:
                code.revoked_at = now

        # Generate and insert new passcode
        plain_code = generate_passcode()
        new_passcode = Passcode(
            cohort_id=cohort_id,
            code_hash=hash_passcode(plain_code),
            label=label or "Rotated Passcode",
            valid_from=now,
            valid_until=cohort.expires_at,
            uses_count=0,
            rotated_from_id=last_code_id,
        )
        db.add(new_passcode)

        audit = AuditLog(
            actor_id=actor_id,
            action="ROTATE_PASSCODE",
            entity="Cohort",
            entity_id=cohort_id,
            details={"grace_period_minutes": grace_period_minutes},
            ip=ip,
        )
        db.add(audit)
        await db.commit()
        await db.refresh(new_passcode)

        return new_passcode, plain_code

    @staticmethod
    async def extend_cohort(
        db: AsyncSession,
        cohort_id: str,
        additional_days: int,
        actor_id: Optional[str] = None,
        ip: Optional[str] = None,
    ) -> Cohort:
        """Extend cohort expiration window."""
        cohort = await db.get(Cohort, cohort_id)
        if not cohort:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cohort not found")

        old_expiry = cohort.expires_at
        cohort.expires_at = old_expiry + timedelta(days=additional_days)

        audit = AuditLog(
            actor_id=actor_id,
            action="EXTEND_COHORT",
            entity="Cohort",
            entity_id=cohort_id,
            details={
                "additional_days": additional_days,
                "old_expiry": old_expiry.isoformat(),
                "new_expiry": cohort.expires_at.isoformat(),
            },
            ip=ip,
        )
        db.add(audit)
        await db.commit()
        await db.refresh(cohort)
        return cohort

    @staticmethod
    async def revoke_cohort_sessions(
        db: AsyncSession, cohort_id: str, actor_id: Optional[str] = None, ip: Optional[str] = None
    ) -> int:
        """Revoke all active sessions for users belonging to a cohort."""
        now = datetime.now(timezone.utc)
        user_stmt = select(User.id).where(User.cohort_id == cohort_id)
        user_ids = (await db.execute(user_stmt)).scalars().all()

        if not user_ids:
            return 0

        update_stmt = (
            update(AuthSession)
            .where(and_(AuthSession.user_id.in_(user_ids), AuthSession.revoked_at.is_(None)))
            .values(revoked_at=now)
        )
        result = await db.execute(update_stmt)

        audit = AuditLog(
            actor_id=actor_id,
            action="REVOKE_COHORT_SESSIONS",
            entity="Cohort",
            entity_id=cohort_id,
            details={"revoked_count": result.rowcount},
            ip=ip,
        )
        db.add(audit)
        await db.commit()
        return result.rowcount

    @staticmethod
    async def authenticate_passcode(
        db: AsyncSession,
        passcode_plain: str,
        display_name: str,
        ip: str,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Authenticate user by passcode + display name with rate limits, cohort window checks, and token issue."""
        clean_code = normalize_passcode(passcode_plain)
        prefix = clean_code[:4] if len(clean_code) >= 4 else clean_code

        # Rate limit check
        is_allowed, retry_after = await check_login_rate_limit(db, ip=ip, passcode_prefix=prefix)
        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts. Please try again in {retry_after // 60} minutes.",
            )

        now = datetime.now(timezone.utc)

        # Retrieve active passcodes to verify in constant time
        stmt = (
            select(Passcode, Cohort)
            .join(Cohort, Passcode.cohort_id == Cohort.id)
            .where(and_(Passcode.revoked_at.is_(None), Cohort.is_active.is_(True)))
        )
        candidates = (await db.execute(stmt)).all()

        matched_passcode: Optional[Passcode] = None
        matched_cohort: Optional[Cohort] = None

        for p_code, cohort in candidates:
            if verify_passcode(clean_code, p_code.code_hash):
                matched_passcode = p_code
                matched_cohort = cohort
                break

        # Generic authentication failure if no match or constraints violated
        auth_failure_error = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired passcode."
        )

        if not matched_passcode or not matched_cohort:
            await record_login_attempt(db, ip=ip, passcode_prefix=prefix, success=False)
            raise auth_failure_error

        # Ensure timezone-aware comparisons
        cohort_expires_at = matched_cohort.expires_at
        if cohort_expires_at.tzinfo is None:
            cohort_expires_at = cohort_expires_at.replace(tzinfo=timezone.utc)

        if now > cohort_expires_at:
            await record_login_attempt(db, ip=ip, passcode_prefix=prefix, success=False)
            raise auth_failure_error

        if matched_passcode.valid_until is not None:
            code_valid_until = matched_passcode.valid_until
            if code_valid_until.tzinfo is None:
                code_valid_until = code_valid_until.replace(tzinfo=timezone.utc)
            if now > code_valid_until:
                await record_login_attempt(db, ip=ip, passcode_prefix=prefix, success=False)
                raise auth_failure_error

        if (
            matched_passcode.max_uses is not None
            and matched_passcode.uses_count >= matched_passcode.max_uses
        ):
            await record_login_attempt(db, ip=ip, passcode_prefix=prefix, success=False)
            raise auth_failure_error

        # Valid login: record success
        await record_login_attempt(db, ip=ip, passcode_prefix=prefix, success=True)
        matched_passcode.uses_count += 1

        # Find or create user in cohort
        user_stmt = select(User).where(
            and_(User.cohort_id == matched_cohort.id, User.display_name == display_name)
        )
        user = (await db.execute(user_stmt)).scalar_one_or_none()

        if not user:
            user = User(
                cohort_id=matched_cohort.id,
                display_name=display_name,
                role="trainee",
                is_active=True,
                last_login_at=now,
            )
            db.add(user)
            await db.flush()
        else:
            user.last_login_at = now

        # Create access token tied to cohort remaining time
        token_str, jti, token_expires_at = create_access_token(
            user_id=user.id,
            role=user.role,
            cohort_id=matched_cohort.id,
            cohort_expires_at=cohort_expires_at,
        )

        # Store session token hash
        auth_session = AuthSession(
            user_id=user.id,
            token_hash=hash_token(token_str),
            expires_at=token_expires_at,
            ip=ip,
            user_agent=user_agent,
        )
        db.add(auth_session)

        # Audit
        audit = AuditLog(
            actor_id=user.id,
            action="LOGIN_SUCCESS",
            entity="User",
            entity_id=user.id,
            details={"cohort_id": matched_cohort.id, "display_name": display_name},
            ip=ip,
        )
        db.add(audit)
        await db.commit()
        await db.refresh(user)

        return {
            "access_token": token_str,
            "token_type": "bearer",
            "expires_at": token_expires_at.isoformat(),
            "user": {
                "id": user.id,
                "display_name": user.display_name,
                "role": user.role,
                "cohort_id": user.cohort_id,
            },
            "cohort": {
                "id": matched_cohort.id,
                "name": matched_cohort.name,
                "expires_at": cohort_expires_at.isoformat(),
                "track_access": matched_cohort.track_access,
            },
        }
