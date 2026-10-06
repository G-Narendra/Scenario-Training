from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from backend.app.db.models import AuthSession, User
from backend.app.db.session import async_session_factory
from backend.app.security.deps import get_current_user, require_roles
from backend.app.security.passcodes import hash_token
from backend.app.security.tokens import create_access_token
from backend.app.services.access_service import AccessService


@pytest.mark.asyncio
async def test_access_service_not_found_branches():
    async with async_session_factory() as db:
        with pytest.raises(HTTPException) as exc_rotate:
            await AccessService.rotate_passcode(db, cohort_id="non-existent-id")
        assert exc_rotate.value.status_code == 404

        with pytest.raises(HTTPException) as exc_extend:
            await AccessService.extend_cohort(db, cohort_id="non-existent-id", additional_days=10)
        assert exc_extend.value.status_code == 404

        count = await AccessService.revoke_cohort_sessions(db, cohort_id="empty-cohort-id")
        assert count == 0


@pytest.mark.asyncio
async def test_get_current_user_rejections():
    async with async_session_factory() as db:
        # 1. Invalid JWT structure
        creds_invalid = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="invalid.jwt.token"
        )
        with pytest.raises(HTTPException) as exc1:
            await get_current_user(credentials=creds_invalid, db=db)
        assert exc1.value.status_code == 401

        # 2. Token not in AuthSession database
        fake_token, _, _ = create_access_token("fake-user-id", "trainee")
        creds_fake = HTTPAuthorizationCredentials(scheme="Bearer", credentials=fake_token)
        with pytest.raises(HTTPException) as exc2:
            await get_current_user(credentials=creds_fake, db=db)
        assert exc2.value.status_code == 401

        # 3. Inactive user
        user = User(display_name="Disabled User", role="trainee", is_active=False)
        db.add(user)
        await db.commit()
        await db.refresh(user)

        user_token, _, exp = create_access_token(user.id, "trainee")
        db.add(AuthSession(user_id=user.id, token_hash=hash_token(user_token), expires_at=exp))
        await db.commit()

        creds_disabled = HTTPAuthorizationCredentials(scheme="Bearer", credentials=user_token)
        with pytest.raises(HTTPException) as exc3:
            await get_current_user(credentials=creds_disabled, db=db)
        assert exc3.value.status_code == 401


@pytest.mark.asyncio
async def test_require_roles_checker():
    checker = require_roles(["super_admin"])
    admin_user = User(display_name="Admin", role="super_admin", is_active=True)
    trainee_user = User(display_name="Trainee", role="trainee", is_active=True)

    result = await checker(current_user=admin_user)
    assert result == admin_user

    with pytest.raises(HTTPException) as exc:
        await checker(current_user=trainee_user)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_access_service_authenticate_branches():
    async with async_session_factory() as db:
        # Create cohort
        cohort, code = await AccessService.create_cohort(db, name="Branch Cohort", duration_days=30)

        # 1. Valid authentication
        auth_data = await AccessService.authenticate_passcode(
            db=db, passcode_plain=code, display_name="Valid Trainee", ip="198.51.100.20"
        )
        assert "access_token" in auth_data

        # 2. Re-login with same display_name (covers user existing branch line 290)
        auth_data_2 = await AccessService.authenticate_passcode(
            db=db, passcode_plain=code, display_name="Valid Trainee", ip="198.51.100.20"
        )
        assert "access_token" in auth_data_2

        # 3. Invalid passcode
        with pytest.raises(HTTPException) as exc_bad:
            await AccessService.authenticate_passcode(
                db=db, passcode_plain="INVALID-PASS", display_name="Trainee", ip="198.51.100.21"
            )
        assert exc_bad.value.status_code == 401

        # 4. Passcode with max_uses = 1 exceeded
        from sqlalchemy import select

        from backend.app.db.models import Passcode

        passcode_rec = (
            (await db.execute(select(Passcode).where(Passcode.cohort_id == cohort.id)))
            .scalars()
            .first()
        )
        passcode_rec.max_uses = 1
        passcode_rec.uses_count = 1
        await db.commit()

        with pytest.raises(HTTPException) as exc_max:
            await AccessService.authenticate_passcode(
                db=db, passcode_plain=code, display_name="New Trainee", ip="198.51.100.22"
            )
        assert exc_max.value.status_code == 401

        # 5. Passcode with valid_until in the past
        passcode_rec.max_uses = None
        passcode_rec.valid_until = datetime.now(timezone.utc) - timedelta(hours=1)
        await db.commit()

        with pytest.raises(HTTPException) as exc_past:
            await AccessService.authenticate_passcode(
                db=db, passcode_plain=code, display_name="New Trainee", ip="198.51.100.23"
            )
        assert exc_past.value.status_code == 401


@pytest.mark.asyncio
async def test_access_service_rotation_with_grace():
    async with async_session_factory() as db:
        cohort, code = await AccessService.create_cohort(db, name="Grace Cohort", duration_days=30)
        new_passcode, new_code = await AccessService.rotate_passcode(
            db=db, cohort_id=cohort.id, grace_period_minutes=10
        )
        assert new_passcode.valid_until is not None
        assert new_code != code
