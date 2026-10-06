from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.db.session import async_session_factory
from backend.app.main import app
from backend.app.services.access_service import AccessService


@pytest.mark.asyncio
async def test_auth_full_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Setup cohort directly via AccessService
        async with async_session_factory() as db:
            cohort, plain_code = await AccessService.create_cohort(
                db=db, name="Q4 Sales Enablement", duration_days=30, track_access="sales"
            )
            cohort_id = cohort.id

        # 2. Login with valid passcode
        login_res = await client.post(
            "/api/auth/login", json={"passcode": plain_code, "display_name": "Trainee Alice"}
        )
        assert login_res.status_code == 200, login_res.text
        data = login_res.json()
        assert "access_token" in data
        assert data["user"]["display_name"] == "Trainee Alice"
        assert data["user"]["role"] == "trainee"
        assert data["cohort"]["id"] == cohort_id
        token = data["access_token"]

        # 3. Access /api/auth/me with valid token
        me_res = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200
        assert me_res.json()["display_name"] == "Trainee Alice"

        # 4. Role escalation test: Trainee cannot access admin endpoints
        admin_res = await client.get(
            "/api/admin/cohorts", headers={"Authorization": f"Bearer {token}"}
        )
        assert admin_res.status_code == 403

        # 5. Token tampering test
        tampered_token = token[:-5] + "XXXXX"
        tampered_res = await client.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {tampered_token}"}
        )
        assert tampered_res.status_code == 401

        # 6. Wrong passcode test
        bad_login = await client.post(
            "/api/auth/login", json={"passcode": "INVALID-CODE", "display_name": "Bob"}
        )
        assert bad_login.status_code == 401
        assert "Invalid or expired passcode" in bad_login.json()["detail"]

        # 7. Logout test
        logout_res = await client.post(
            "/api/auth/logout", headers={"Authorization": f"Bearer {token}"}
        )
        assert logout_res.status_code == 200

        # After logout, token must be rejected
        after_logout = await client.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
        assert after_logout.status_code == 401


@pytest.mark.asyncio
async def test_passcode_rotation_and_revocation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create cohort
        async with async_session_factory() as db:
            cohort, initial_code = await AccessService.create_cohort(
                db=db, name="Leadership Cohort", duration_days=30
            )
            cohort_id = cohort.id

        # Login with initial code
        res1 = await client.post(
            "/api/auth/login", json={"passcode": initial_code, "display_name": "Leader Dave"}
        )
        assert res1.status_code == 200
        dave_token = res1.json()["access_token"]

        # Rotate passcode
        async with async_session_factory() as db:
            _, new_code = await AccessService.rotate_passcode(db=db, cohort_id=cohort_id)

        # Login with old code must FAIL
        old_attempt = await client.post(
            "/api/auth/login", json={"passcode": initial_code, "display_name": "Leader Eve"}
        )
        assert old_attempt.status_code == 401

        # Login with new code must SUCCEED
        new_attempt = await client.post(
            "/api/auth/login", json={"passcode": new_code, "display_name": "Leader Eve"}
        )
        assert new_attempt.status_code == 200

        # Existing session Dave remains valid
        dave_check = await client.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {dave_token}"}
        )
        assert dave_check.status_code == 200

        # Revoke all sessions for cohort
        async with async_session_factory() as db:
            await AccessService.revoke_cohort_sessions(db=db, cohort_id=cohort_id)

        # Dave is now rejected immediately
        dave_revoked = await client.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {dave_token}"}
        )
        assert dave_revoked.status_code == 401


@pytest.mark.asyncio
async def test_expired_cohort_enforcement():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create cohort that expired 1 day ago
        async with async_session_factory() as db:
            cohort, plain_code = await AccessService.create_cohort(
                db=db, name="Expired Cohort", duration_days=1
            )
            # Manually set expires_at in the past
            cohort.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
            await db.commit()

        # Login must fail
        login_res = await client.post(
            "/api/auth/login", json={"passcode": plain_code, "display_name": "Late Trainee"}
        )
        assert login_res.status_code == 401


@pytest.mark.asyncio
async def test_brute_force_lockout():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Send 5 failed attempts from a specific unique test IP
        test_ip = "198.51.100.99"
        headers = {"X-Forwarded-For": test_ip}
        for i in range(5):
            res = await client.post(
                "/api/auth/login",
                json={"passcode": f"FAIL-{i}999", "display_name": "Attacker"},
                headers=headers,
            )
            assert res.status_code == 401

        # 6th attempt should be locked out with HTTP 429
        lockout_res = await client.post(
            "/api/auth/login",
            json={"passcode": "FAIL-9999", "display_name": "Attacker"},
            headers=headers,
        )
        assert lockout_res.status_code == 429
        assert "Too many failed login attempts" in lockout_res.json()["detail"]
