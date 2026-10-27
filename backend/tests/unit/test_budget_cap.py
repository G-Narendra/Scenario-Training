import pytest
from datetime import timedelta
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.db.base import utc_now
from backend.app.db.models import Cohort, Passcode, Scenario, Track, UsageEvent, User
from backend.app.db.session import async_session_factory
from backend.app.security.passcodes import hash_passcode
from backend.app.services.access_service import invalidate_passcode_cache


@pytest.mark.asyncio
async def test_cohort_ten_dollar_budget_cap_lock():
    """Verify that a cohort is hard-locked when compute spend reaches the $10 USD ceiling."""
    now = utc_now()

    async with async_session_factory() as db:
        track = Track(key="leadership", name="Leadership Track")
        db.add(track)
        await db.flush()

        cohort = Cohort(
            name="Budget-Capped Cohort",
            starts_at=now - timedelta(hours=1),
            expires_at=now + timedelta(hours=5),
            budget_cap_usd=10.0,  # $10 hard safety ceiling
            track_access="both",
        )
        db.add(cohort)
        await db.flush()

        passcode = Passcode(
            cohort_id=cohort.id,
            code_hash=hash_passcode("BUDGET-PASS"),
            label="Budget Pass",
            valid_from=now - timedelta(hours=1),
            valid_until=now + timedelta(hours=5),
            max_uses=50,
        )
        db.add(passcode)

        scen = Scenario(
            track_id=track.id,
            slug="budget-cap-test-scenario",
            title="Budget Cap Scenario",
            status="published",
            difficulty=1,
            topic="leadership",
            version=1,
            duration_limit_seconds=600,
            turn_limit=25,
            brief="Testing budget ceiling lock.",
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
        cohort_id = cohort.id
        scen_id = scen.id

    invalidate_passcode_cache()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Login
        login_res = await client.post(
            "/api/auth/login",
            json={"passcode": "BUDGET-PASS", "display_name": "Trainee Under Cap"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Under cap ($0 spend) -> Attempt succeeds (201)
        res1 = await client.post(
            "/api/sessions",
            headers=headers,
            json={"scenario_id": scen_id, "mode": "text"},
        )
        assert res1.status_code == 201

        # 2. Exceed the $10 budget cap
        async with async_session_factory() as db:
            user_id = login_res.json()["user"]["id"]
            usage = UsageEvent(
                user_id=user_id,
                cohort_id=cohort_id,
                type="llm",
                units=2000000,
                cost_estimate=10.05,  # Exceeds $10 ceiling
            )
            db.add(usage)
            await db.commit()

        # Invalidate spend cache
        from backend.app.api.sessions import _cohort_spend_cache
        _cohort_spend_cache.clear()

        # 3. Next session attempt -> Must be BLOCKED with HTTP 403 BUDGET_CAP_EXCEEDED
        res2 = await client.post(
            "/api/sessions",
            headers=headers,
            json={"scenario_id": scen_id, "mode": "text"},
        )
        assert res2.status_code == 403
        assert "BUDGET_CAP_EXCEEDED" in res2.json()["detail"]
