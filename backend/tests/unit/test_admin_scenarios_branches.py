from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.db.models import AuthSession, Cohort, Scenario, ScenarioVersion, Track, User
from backend.app.db.session import async_session_factory
from backend.app.main import app
from backend.app.security.passcodes import hash_token
from backend.app.security.tokens import create_access_token


@pytest.fixture
async def setup_admin_scenarios_branch_data():
    async with async_session_factory() as db:
        now = datetime.now(timezone.utc)
        cohort = Cohort(name="Admin Scen Cohort", expires_at=now + timedelta(days=30))
        db.add(cohort)
        await db.flush()

        super_admin = User(display_name="Super Admin", role="super_admin", cohort_id=cohort.id)
        db.add(super_admin)
        await db.flush()

        track = Track(key="sales", name="Sales Track")
        db.add(track)
        await db.flush()

        scenario = Scenario(
            track_id=track.id,
            slug="admin-test-scenario",
            title="Admin Test Scenario",
            status="draft",
            difficulty=1,
            topic="discovery",
            duration_limit_seconds=300,
            turn_limit=10,
            brief="Admin scenario test.",
            persona={
                "name": "Sam",
                "role": "Buyer",
                "personality": ["friendly"],
                "communication_style": "Friendly",
            },
            hidden_motivations=["Testing admin CRUD"],
            objections=["No objections"],
            success_criteria=["Complete simulation"],
            skills_assessed=[{"skill": "discovery_questions", "weight": 1.0}],
            opening_line="Hello there.",
        )
        db.add(scenario)
        await db.flush()

        v1_snapshot = {
            "slug": scenario.slug,
            "track": "sales",
            "title": scenario.title,
            "topic": scenario.topic,
            "difficulty": scenario.difficulty,
            "duration_limit_seconds": scenario.duration_limit_seconds,
            "turn_limit": scenario.turn_limit,
            "brief": scenario.brief,
            "persona": scenario.persona,
            "hidden_motivations": scenario.hidden_motivations,
            "objections": scenario.objections,
            "curveballs": scenario.curveballs,
            "success_criteria": scenario.success_criteria,
            "skills_assessed": scenario.skills_assessed,
            "opening_line": scenario.opening_line,
        }
        db.add(
            ScenarioVersion(
                scenario_id=scenario.id,
                version=1,
                snapshot=v1_snapshot,
                changed_by=super_admin.id,
                change_note="Initial version",
            )
        )

        token, _, _ = create_access_token(super_admin.id, super_admin.role)
        db.add(
            AuthSession(
                user_id=super_admin.id,
                token_hash=hash_token(token),
                expires_at=now + timedelta(hours=12),
            )
        )
        await db.commit()

        return {
            "scenario_id": scenario.id,
            "admin_token": token,
        }


@pytest.mark.asyncio
async def test_admin_scenarios_lifecycle_branches(setup_admin_scenarios_branch_data):
    data = setup_admin_scenarios_branch_data
    scen_id = data["scenario_id"]
    headers = {"Authorization": f"Bearer {data['admin_token']}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Duplicate scenario
        r_dup = await ac.post(f"/api/admin/scenarios/{scen_id}/duplicate", headers=headers)
        assert r_dup.status_code == 201
        dup_id = r_dup.json()["id"]
        assert "Copy" in r_dup.json()["title"]

        # 2. Archive scenario
        r_arch = await ac.post(f"/api/admin/scenarios/{dup_id}/archive", headers=headers)
        assert r_arch.status_code == 200
        assert r_arch.json()["status"] == "archived"

        # 3. Get scenario versions
        r_vers = await ac.get(f"/api/admin/scenarios/{scen_id}/versions", headers=headers)
        assert r_vers.status_code == 200
        assert isinstance(r_vers.json(), list)

        # 4. Dry-run validate invalid scenario
        invalid_yaml = "invalid: yaml: ["
        r_val = await ac.post(
            "/api/admin/scenarios/validate",
            headers=headers,
            json={"content": invalid_yaml, "format": "yaml"},
        )
        assert r_val.status_code == 200
        val_res = r_val.json()
        assert val_res["valid"] is False
        assert len(val_res["errors"]) > 0

        # 5. AI draft scenario generation
        r_ai = await ac.post(
            "/api/admin/scenarios/ai-draft",
            headers=headers,
            json={
                "topic": "salary negotiation",
                "difficulty": 4,
                "track": "leadership",
            },
        )
        assert r_ai.status_code == 200
        ai_draft = r_ai.json()
        assert ai_draft["track"] == "leadership"
        assert ai_draft["difficulty"] == 3
        assert "slug" in ai_draft

        # 6. Publish scenario
        r_pub = await ac.post(f"/api/admin/scenarios/{scen_id}/publish", headers=headers)
        assert r_pub.status_code == 200
        assert r_pub.json()["status"] == "published"

        # 7. Export YAML
        r_yaml = await ac.get(f"/api/admin/scenarios/{scen_id}/export", headers=headers)
        assert r_yaml.status_code == 200
        assert "yaml" in r_yaml.json()

        # 8. Restore version
        r_restore = await ac.post(
            f"/api/admin/scenarios/{scen_id}/versions/1/restore", headers=headers
        )
        assert r_restore.status_code == 200
        assert r_restore.json()["version"] >= 1

        # 9. List scenarios with filter
        r_list = await ac.get("/api/admin/scenarios?status=published", headers=headers)
        assert r_list.status_code == 200

        # 10. Delete duplicated scenario
        r_del = await ac.delete(f"/api/admin/scenarios/{dup_id}", headers=headers)
        assert r_del.status_code == 204

        # 11. 404 branches
        r_404_get = await ac.get("/api/admin/scenarios/nonexistent-id", headers=headers)
        assert r_404_get.status_code == 404

        r_404_pub = await ac.post("/api/admin/scenarios/nonexistent-id/publish", headers=headers)
        assert r_404_pub.status_code == 404

        r_404_arch = await ac.post("/api/admin/scenarios/nonexistent-id/archive", headers=headers)
        assert r_404_arch.status_code == 404

        r_404_dup = await ac.post("/api/admin/scenarios/nonexistent-id/duplicate", headers=headers)
        assert r_404_dup.status_code == 404
