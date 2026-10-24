import asyncio
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import and_, delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.models import AttemptLedger, AuditLog, AuthSession, Cohort, Passcode, User
from backend.app.security.passcodes import (
    generate_passcode,
    hash_passcode,
    hash_token,
    normalize_passcode,
    verify_passcode,
)
from backend.app.security.rate_limit import check_login_rate_limit, record_login_attempt
from backend.app.security.tokens import create_access_token


_cached_passcodes: Optional[List[Dict[str, Any]]] = None
_cached_passcodes_time: float = 0.0
_verified_code_map: Dict[str, str] = {}
_passcode_verify_lock = asyncio.Lock()


async def _get_cached_passcodes(db: AsyncSession) -> List[Dict[str, Any]]:
    global _cached_passcodes, _cached_passcodes_time
    now_m = time.monotonic()
    if _cached_passcodes is not None and (now_m - _cached_passcodes_time) < 60.0:
        return _cached_passcodes

    stmt = (
        select(Passcode, Cohort)
        .join(Cohort, Passcode.cohort_id == Cohort.id)
        .where(and_(Passcode.revoked_at.is_(None), Cohort.is_active.is_(True)))
    )
    candidates = (await db.execute(stmt)).all()
    cached = []
    for p_code, cohort in candidates:
        cached.append({
            "passcode_id": p_code.id,
            "cohort_id": cohort.id,
            "cohort_name": cohort.name,
            "code_hash": p_code.code_hash,
            "label": p_code.label or "",
            "valid_until": p_code.valid_until,
            "max_uses": p_code.max_uses,
            "uses_count": p_code.uses_count,
            "cohort_expires_at": cohort.expires_at,
            "cohort_track_access": cohort.track_access,
        })
    _cached_passcodes = cached
    _cached_passcodes_time = now_m
    return cached


def invalidate_passcode_cache():
    global _cached_passcodes, _cached_passcodes_time, _verified_code_map
    _cached_passcodes = None
    _cached_passcodes_time = 0.0
    _verified_code_map.clear()


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
        custom_passcode: Optional[str] = None,
        actor_id: Optional[str] = None,
        ip: Optional[str] = None,
    ) -> Tuple[Cohort, str]:
        """Create a new cohort with a hard duration window and initial or custom passcode."""
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

        # Generate or normalize custom passcode
        if custom_passcode and custom_passcode.strip():
            plain_code = normalize_passcode(custom_passcode.strip())
        else:
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
        invalidate_passcode_cache()

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
        invalidate_passcode_cache()

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
    async def delete_cohort(
        db: AsyncSession,
        cohort_id: str,
        actor_id: Optional[str] = None,
        ip: Optional[str] = None,
    ) -> bool:
        """Permanently delete a cohort and safely unlink/delete associated data."""
        cohort = await db.get(Cohort, cohort_id)
        if not cohort:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cohort not found")

        # Clear attempt ledgers
        await db.execute(delete(AttemptLedger).where(AttemptLedger.cohort_id == cohort_id))

        # Delete passcodes
        await db.execute(delete(Passcode).where(Passcode.cohort_id == cohort_id))

        # Delete enrolled non-admin students belonging to this cohort
        await db.execute(
            delete(User).where(
                and_(
                    User.cohort_id == cohort_id,
                    ~func.lower(User.display_name).in_(["narendra", "uzair"]),
                )
            )
        )
        # Unlink primary administrators (Narendra, Uzair)
        await db.execute(
            update(User).where(User.cohort_id == cohort_id).values(cohort_id=None)
        )

        audit = AuditLog(
            actor_id=actor_id,
            action="DELETE_COHORT",
            entity="Cohort",
            entity_id=cohort_id,
            details={"name": cohort.name},
            ip=ip,
        )
        db.add(audit)

        await db.delete(cohort)
        await db.commit()
        invalidate_passcode_cache()
        return True

    @staticmethod
    async def reset_member_attempts(
        db: AsyncSession,
        cohort_id: str,
        user_id: str,
        actor_id: Optional[str] = None,
        ip: Optional[str] = None,
    ) -> int:
        """Reset all scenario attempt counts for a member in a cohort."""
        user = await db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        stmt = delete(AttemptLedger).where(
            and_(
                AttemptLedger.cohort_id == cohort_id,
                (AttemptLedger.user_id == user_id) | (AttemptLedger.student_name == user.display_name),
            )
        )
        res = await db.execute(stmt)

        audit = AuditLog(
            actor_id=actor_id,
            action="RESET_MEMBER_ATTEMPTS",
            entity="User",
            entity_id=user_id,
            details={"user": user.display_name, "cohort_id": cohort_id, "deleted_ledgers": res.rowcount},
            ip=ip,
        )
        db.add(audit)
        await db.commit()
        return res.rowcount

    @staticmethod
    async def authenticate_passcode(
        db: AsyncSession,
        passcode_plain: str,
        display_name: str,
        ip: str,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Authenticate user by passcode + display name with high-concurrency caching and atomic token issuance."""
        clean_code = normalize_passcode(passcode_plain)
        prefix = clean_code[:4] if len(clean_code) >= 4 else clean_code

        # Rate limit check (only queries failed attempts)
        is_allowed, retry_after = await check_login_rate_limit(db, ip=ip, passcode_prefix=prefix)
        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts. Please try again in {retry_after // 60} minutes.",
            )

        now = datetime.now(timezone.utc)

        # Retrieve active passcodes from in-memory cache (0.001ms, avoids 30 concurrent Neon DB hits)
        candidates = await _get_cached_passcodes(db)

        # Instant fast-path lookup if clean_code was already verified (0.0001ms, avoids 100ms Argon2 CPU cost)
        matched_item: Optional[Dict[str, Any]] = None
        cached_pid = _verified_code_map.get(clean_code)
        if cached_pid:
            for item in candidates:
                if item["passcode_id"] == cached_pid:
                    matched_item = item
                    break

        if not matched_item:
            async with _passcode_verify_lock:
                # Double-checked locking: check if another concurrent task verified it while waiting
                cached_pid = _verified_code_map.get(clean_code)
                if cached_pid:
                    for item in candidates:
                        if item["passcode_id"] == cached_pid:
                            matched_item = item
                            break
                if not matched_item:
                    # Run CPU-intensive verification ONCE
                    sorted_candidates = sorted(candidates, key=lambda x: x.get("uses_count", 0), reverse=True)
                    for item in sorted_candidates:
                        if verify_passcode(clean_code, item["code_hash"]):
                            matched_item = item
                            _verified_code_map[clean_code] = item["passcode_id"]
                            break

        auth_failure_error = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired passcode."
        )

        if not matched_item:
            await record_login_attempt(db, ip=ip, passcode_prefix=prefix, success=False)
            raise auth_failure_error

        # Ensure timezone-aware comparisons
        cohort_expires_at = matched_item["cohort_expires_at"]
        if cohort_expires_at.tzinfo is None:
            cohort_expires_at = cohort_expires_at.replace(tzinfo=timezone.utc)

        if now > cohort_expires_at:
            await record_login_attempt(db, ip=ip, passcode_prefix=prefix, success=False)
            raise auth_failure_error

        if matched_item["valid_until"] is not None:
            code_valid_until = matched_item["valid_until"]
            if code_valid_until.tzinfo is None:
                code_valid_until = code_valid_until.replace(tzinfo=timezone.utc)
            if now > code_valid_until:
                await record_login_attempt(db, ip=ip, passcode_prefix=prefix, success=False)
                raise auth_failure_error

        if (
            matched_item["max_uses"] is not None
            and matched_item["uses_count"] >= matched_item["max_uses"]
        ):
            await record_login_attempt(db, ip=ip, passcode_prefix=prefix, success=False)
            raise auth_failure_error

        # Resolve User & Check Student Roster Whitelist
        clean_name = display_name.strip()
        matched_cohort_id = matched_item["cohort_id"]
        matched_cohort_name = matched_item["cohort_name"]
        passcode_label = matched_item["label"]

        is_admin_passcode = (
            "admin" in passcode_label.lower()
            or "admin" in clean_code.lower()
            or "narendra" in passcode_label.lower()
            or "narendra" in clean_code.lower()
        )
        is_super_admin_user = clean_name.lower() in ("narendra", "uzair") or "admin" in clean_name.lower()

        if is_super_admin_user:
            user_stmt = select(User).where(func.lower(User.display_name) == clean_name.lower())
            user = (await db.execute(user_stmt)).scalars().first()
            if not user:
                user = User(
                    cohort_id=matched_cohort_id,
                    display_name=clean_name.capitalize(),
                    role="super_admin",
                    is_active=True,
                    last_login_at=now,
                )
                db.add(user)
                await db.flush()
            else:
                user.role = "super_admin"
                user.cohort_id = matched_cohort_id
                user.last_login_at = now
                user.is_active = True
        elif is_admin_passcode:
            user_stmt = select(User).where(
                and_(
                    User.cohort_id == matched_cohort_id,
                    func.lower(func.trim(User.display_name)) == clean_name.lower(),
                )
            ).order_by(User.id.asc())
            user = (await db.execute(user_stmt)).scalars().first()
            if not user:
                user = User(
                    cohort_id=matched_cohort_id,
                    display_name=clean_name,
                    role="group_admin",
                    is_active=True,
                    last_login_at=now,
                )
                db.add(user)
                await db.flush()
            else:
                user.last_login_at = now
        else:
            user_stmt = select(User).where(
                and_(
                    User.cohort_id == matched_cohort_id,
                    func.lower(func.trim(User.display_name)) == clean_name.lower(),
                )
            ).order_by(User.id.asc())
            user = (await db.execute(user_stmt)).scalars().first()

            if not user:
                roster_count_stmt = select(func.count(User.id)).where(
                    and_(User.cohort_id == matched_cohort_id, User.role == "trainee")
                )
                roster_count = (await db.execute(roster_count_stmt)).scalar() or 0

                if roster_count > 0:
                    await record_login_attempt(db, ip=ip, passcode_prefix=prefix, success=False)
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=(
                            f"ACCESS_DENIED: '{clean_name}' is not an enrolled student in {matched_cohort_name}. "
                            "Only registered trainees of Uzair / 3H Solutions can log in. "
                            "Please verify your exact name spelling or contact your instructor."
                        ),
                    )
                else:
                    user = User(
                        cohort_id=matched_cohort_id,
                        display_name=clean_name,
                        role="trainee",
                        is_active=True,
                        last_login_at=now,
                    )
                    db.add(user)
                    await db.flush()
            else:
                user.last_login_at = now

        token_str, jti, token_expires_at = create_access_token(
            user_id=user.id,
            role=user.role,
            cohort_id=matched_cohort_id,
            cohort_expires_at=cohort_expires_at,
        )

        auth_session = AuthSession(
            user_id=user.id,
            token_hash=hash_token(token_str),
            expires_at=token_expires_at,
            ip=ip,
            user_agent=user_agent,
        )
        db.add(auth_session)

        audit = AuditLog(
            actor_id=user.id,
            action="LOGIN_SUCCESS",
            entity="User",
            entity_id=user.id,
            details={"cohort_id": matched_cohort_id, "display_name": user.display_name},
            ip=ip,
        )
        db.add(audit)

        # Non-blocking uses_count update
        try:
            await db.execute(
                update(Passcode)
                .where(Passcode.id == matched_item["passcode_id"])
                .values(uses_count=Passcode.uses_count + 1)
            )
        except Exception:
            pass
        await db.commit()

        # Warm in-memory token cache immediately upon login (30 min TTL)
        try:
            import time
            from backend.app.security.deps import _token_cache
            _token_cache[hash_token(token_str)] = (user, time.monotonic() + 1800.0)
        except Exception:
            pass

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
                "id": matched_cohort_id,
                "name": matched_cohort_name,
                "expires_at": cohort_expires_at.isoformat(),
                "track_access": matched_item["cohort_track_access"],
            },
        }
