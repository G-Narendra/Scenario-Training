import pytest
from datetime import timedelta
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.db.base import utc_now
from backend.app.db.models import Cohort, Passcode, Scenario, Track
from backend.app.db.session import async_session_factory
from backend.app.security.passcodes import hash_passcode


@pytest.mark.asyncio
async def test_max_two_attempts_lock_and_fingerprint_bypass_prevention():
    """
    Enforce enterprise security:
    1. A student can only execute maximum 2 practice runs per scenario.
    2. Attempt 1 succeeds, Attempt 2 succeeds, Attempt 3 is blocked with HTTP 429 ATTEMPT_LIMIT_REACHED.
    3. Changing display name / logging in again with the same device fingerprint is blocked on attempt 3.
    """
    now = utc_now()

    async with async_session_factory() as db:
        track = Track(key="leadership", name="Executive Leadership", description="Leadership track")
        db.add(track)
        await db.flush()

        cohort = Cohort(
            name="Executive Leadership Cohort",
            starts_at=now - timedelta(hours=1),
            expires_at=now + timedelta(hours=5),
            budget_cap_usd=50.0,
            track_access="both",
        )
        db.add(cohort)
        await db.flush()

        passcode = Passcode(
            cohort_id=cohort.id,
            code_hash=hash_passcode("EXEC-2026"),
            label="Executive Passcode",
            valid_from=now - timedelta(hours=1),
            valid_until=now + timedelta(hours=5),
            max_uses=50,
        )
        db.add(passcode)

        scen = Scenario(
            track_id=track.id,
            slug="quiet-high-performer",
            title="Managing Quiet High-Performer",
            status="published",
            difficulty=2,
            topic="performance",
            version=1,
            duration_limit_seconds=600,
            turn_limit=25,
            brief="Managing a quiet high performer who may be burned out.",
            persona={"name": "Liam", "role": "Lead Architect", "emotional_baseline": "guarded"},
            hidden_motivations=["Fears being pigeonholed"],
            objections=["Already overloaded"],
            curveballs=[],
            success_criteria=["Demonstrate empathy"],
            skills_assessed=[{"skill": "constructive_feedback", "weight": 1.0}],
            opening_line="Hello, what did you want to discuss?",
            tags=["leadership"],
            tactical_coaching_clue="Focus on open discovery questions.",
            target_capabilities=["Constructive Feedback", "Active Listening"],
            conclusion_signals={},
        )
        db.add(scen)
        await db.commit()
        scen_id = scen.id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Login with student name
        device_fp = "c65a88bf0a0b23f81e3e620b192c7860123456789abcdef0123456789abcdef0"
        login_res = await client.post(
            "/api/auth/login",
            json={"passcode": "EXEC-2026", "display_name": "Sarah Executive"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {
            "Authorization": f"Bearer {token}",
            "X-Device-Fingerprint": device_fp,
        }

        # Attempt 1 -> Must succeed (201 Created)
        res1 = await client.post(
            "/api/sessions",
            headers=headers,
            json={"scenario_id": scen_id, "mode": "text"},
        )
        assert res1.status_code == 201, f"Attempt 1 should succeed: {res1.text}"

        # Attempt 2 -> Must succeed (201 Created)
        res2 = await client.post(
            "/api/sessions",
            headers=headers,
            json={"scenario_id": scen_id, "mode": "text"},
        )
        assert res2.status_code == 201, f"Attempt 2 should succeed: {res2.text}"

        # Attempt 3 -> Must be BLOCKED with HTTP 429 Too Many Requests
        res3 = await client.post(
            "/api/sessions",
            headers=headers,
            json={"scenario_id": scen_id, "mode": "text"},
        )
        assert res3.status_code == 429
        assert "ATTEMPT_LIMIT_REACHED" in res3.json()["detail"]
        assert "2 assigned practice attempts" in res3.json()["detail"]

        # Step 2: Attempting fake-name bypass with different student name on the same device
        fake_login = await client.post(
            "/api/auth/login",
            json={"passcode": "EXEC-2026", "display_name": "Fake Name Bypass"},
        )
        assert fake_login.status_code == 200
        fake_token = fake_login.json()["access_token"]
        fake_headers = {
            "Authorization": f"Bearer {fake_token}",
            "X-Device-Fingerprint": device_fp,
        }

        # Must still be blocked because device fingerprint reached 2 attempts
        fake_attempt = await client.post(
            "/api/sessions",
            headers=fake_headers,
            json={"scenario_id": scen_id, "mode": "text"},
        )
        assert fake_attempt.status_code == 429
        assert "ATTEMPT_LIMIT_REACHED" in fake_attempt.json()["detail"]


@pytest.mark.asyncio
async def test_admin_exemption_from_attempt_limit():
    """Verify instructors and administrators have unlimited scenario runs."""
    now = utc_now()
    async with async_session_factory() as db:
        track = Track(key="leadership", name="Executive Leadership")
        db.add(track)
        await db.flush()
        cohort = Cohort(
            name="Admin Cohort",
            starts_at=now - timedelta(hours=1),
            expires_at=now + timedelta(hours=5),
            budget_cap_usd=50.0,
            track_access="both",
        )
        db.add(cohort)
        await db.flush()
        passcode = Passcode(
            cohort_id=cohort.id,
            code_hash=hash_passcode("ADMIN-PASS"),
            label="Admin Pass",
            valid_from=now - timedelta(hours=1),
            valid_until=now + timedelta(hours=5),
            max_uses=50,
        )
        db.add(passcode)
        scen = Scenario(
            track_id=track.id,
            slug="admin-test-scenario",
            title="Admin Scenario",
            status="published",
            difficulty=1,
            topic="leadership",
            version=1,
            duration_limit_seconds=600,
            turn_limit=25,
            brief="Testing admin unlimited attempts.",
            persona={"name": "Liam", "role": "Architect"},
            hidden_motivations=[],
            objections=[],
            curveballs=[],
            success_criteria=[],
            skills_assessed=[],
            opening_line="Ready.",
            tags=["leadership"],
        )
        db.add(scen)
        await db.commit()
        scen_id = scen.id

    from backend.app.services.access_service import invalidate_passcode_cache
    invalidate_passcode_cache()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Login as Narendra (super_admin / developer)
        login_res = await client.post(
            "/api/auth/login",
            json={"passcode": "ADMIN-PASS", "display_name": "Narendra"},
        )
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3 consecutive attempts all succeed
        for i in range(1, 4):
            res = await client.post(
                "/api/sessions",
                headers=headers,
                json={"scenario_id": scen_id, "mode": "text"},
            )
            assert res.status_code == 201, f"Admin attempt {i} should succeed"
