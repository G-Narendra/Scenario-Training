from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.db.models import AuthSession, Cohort, User
from backend.app.db.session import async_session_factory
from backend.app.main import app
from backend.app.security.passcodes import hash_token
from backend.app.security.tokens import create_access_token

SAMPLE_YAML = """
slug: dynamic-api-scenario
track: sales
title: "Dynamic API Scenario"
topic: objection_handling
difficulty: 2
duration_limit_seconds: 500
turn_limit: 20
brief: "This scenario was added entirely through the Admin API without any code change."
persona:
  name: "Morgan Bailey"
  role: "Chief Commercial Officer"
  personality: ["skeptical", "pragmatic"]
  communication_style: "Direct and demanding data."
  emotional_baseline: "guarded"
hidden_motivations:
  - "SUPER_SECRET_INTERNAL_BUDGET_CAP_NOT_FOR_TRAINEES"
objections:
  - "Your pricing is 30% higher than market."
curveballs:
  - trigger: "turn 4"
    event: "Interrupts meeting."
success_criteria:
  - "Uncover true requirement."
skills_assessed:
  - {skill: objection_handling, weight: 0.5}
  - {skill: value_articulation, weight: 0.5}
opening_line: "Let's see what your solution offers."
tags: [dynamic, api-test]
conclusion_signals:
  positive: ["Agrees to pilot"]
  negative: ["Walks out"]
"""


@pytest.fixture
async def auth_tokens():
    async with async_session_factory() as db:
        # Create cohort
        cohort = Cohort(
            name="API Test Cohort", expires_at=datetime.now(timezone.utc) + timedelta(days=30)
        )
        db.add(cohort)
        await db.flush()

        admin = User(display_name="Admin Jane", role="group_admin", cohort_id=cohort.id)
        trainee = User(display_name="Trainee Sam", role="trainee", cohort_id=cohort.id)
        db.add_all([admin, trainee])
        await db.commit()
        await db.refresh(admin)
        await db.refresh(trainee)

        admin_token, _, _ = create_access_token(admin.id, admin.role)
        trainee_token, _, _ = create_access_token(trainee.id, trainee.role)

        exp = datetime.now(timezone.utc) + timedelta(hours=12)
        db.add(AuthSession(user_id=admin.id, token_hash=hash_token(admin_token), expires_at=exp))
        db.add(
            AuthSession(user_id=trainee.id, token_hash=hash_token(trainee_token), expires_at=exp)
        )
        await db.commit()

        return {"admin": admin_token, "trainee": trainee_token}


@pytest.mark.asyncio
async def test_public_scenarios_and_hidden_field_leakage(auth_tokens):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. First import a scenario with a distinct secret hidden motivation
        import_res = await client.post(
            "/api/admin/scenarios/import",
            content=SAMPLE_YAML,
            headers={
                "Authorization": f"Bearer {auth_tokens['admin']}",
                "Content-Type": "text/plain",
            },
        )
        assert import_res.status_code == 200, import_res.text
        scenario_id = import_res.json()["id"]

        # 2. List tracks
        tracks_res = await client.get(
            "/api/tracks", headers={"Authorization": f"Bearer {auth_tokens['trainee']}"}
        )
        assert tracks_res.status_code == 200
        track_keys = [t["key"] for t in tracks_res.json()]
        assert "sales" in track_keys

        # 3. List scenarios as trainee
        scenarios_res = await client.get(
            "/api/scenarios?track=sales&difficulty=2",
            headers={"Authorization": f"Bearer {auth_tokens['trainee']}"},
        )
        assert scenarios_res.status_code == 200
        scenarios_data = scenarios_res.json()
        assert len(scenarios_data) >= 1
        found = any(s["slug"] == "dynamic-api-scenario" for s in scenarios_data)
        assert found

        # 4. Trainee gets detail for the scenario
        detail_res = await client.get(
            f"/api/scenarios/{scenario_id}",
            headers={"Authorization": f"Bearer {auth_tokens['trainee']}"},
        )
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert detail_data["slug"] == "dynamic-api-scenario"
        assert detail_data["persona"]["name"] == "Morgan Bailey"

        # 5. STRICT LEAKAGE ASSERTIONS
        # The response must NEVER contain hidden motivations, objections, or curveballs!
        detail_raw_text = detail_res.text
        assert "SUPER_SECRET_INTERNAL_BUDGET_CAP_NOT_FOR_TRAINEES" not in detail_raw_text
        assert "hidden_motivations" not in detail_data
        assert "objections" not in detail_data
        assert "curveballs" not in detail_data
        assert "conclusion_signals" not in detail_data


@pytest.mark.asyncio
async def test_admin_scenario_lifecycle_and_versioning(auth_tokens):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Trainee cannot import or create scenario -> 403
        forbidden_res = await client.post(
            "/api/admin/scenarios/import",
            content=SAMPLE_YAML,
            headers={
                "Authorization": f"Bearer {auth_tokens['trainee']}",
                "Content-Type": "text/plain",
            },
        )
        assert forbidden_res.status_code == 403

        # 2. Validate YAML dry-run as admin
        val_res = await client.post(
            "/api/admin/scenarios/validate",
            content=SAMPLE_YAML,
            headers={
                "Authorization": f"Bearer {auth_tokens['admin']}",
                "Content-Type": "text/plain",
            },
        )
        assert val_res.status_code == 200
        assert val_res.json()["valid"] is True

        # 3. Import scenario
        import_res = await client.post(
            "/api/admin/scenarios/import",
            content=SAMPLE_YAML,
            headers={
                "Authorization": f"Bearer {auth_tokens['admin']}",
                "Content-Type": "text/plain",
            },
        )
        assert import_res.status_code == 200
        scen_id = import_res.json()["id"]
        assert import_res.json()["version"] == 1

        # 4. Update scenario (import again with modified title)
        updated_yaml = SAMPLE_YAML.replace(
            'title: "Dynamic API Scenario"', 'title: "Dynamic API Scenario Updated"'
        )
        update_res = await client.post(
            "/api/admin/scenarios/import",
            content=updated_yaml,
            headers={
                "Authorization": f"Bearer {auth_tokens['admin']}",
                "Content-Type": "text/plain",
            },
        )
        assert update_res.status_code == 200
        assert update_res.json()["version"] == 2
        assert update_res.json()["title"] == "Dynamic API Scenario Updated"

        # 5. List versions
        versions_res = await client.get(
            f"/api/admin/scenarios/{scen_id}/versions",
            headers={"Authorization": f"Bearer {auth_tokens['admin']}"},
        )
        assert versions_res.status_code == 200
        versions = versions_res.json()
        assert len(versions) == 2
        assert versions[0]["version"] == 2
        assert versions[1]["version"] == 1

        # 6. Restore version 1
        restore_res = await client.post(
            f"/api/admin/scenarios/{scen_id}/versions/1/restore",
            headers={"Authorization": f"Bearer {auth_tokens['admin']}"},
        )
        assert restore_res.status_code == 200
        assert restore_res.json()["title"] == "Dynamic API Scenario"

        # 7. Export scenario YAML
        export_res = await client.get(
            f"/api/admin/scenarios/{scen_id}/export",
            headers={"Authorization": f"Bearer {auth_tokens['admin']}"},
        )
        assert export_res.status_code == 200
        assert "slug: dynamic-api-scenario" in export_res.json()["yaml"]

        # 8. Archive scenario
        archive_res = await client.post(
            f"/api/admin/scenarios/{scen_id}/archive",
            headers={"Authorization": f"Bearer {auth_tokens['admin']}"},
        )
        assert archive_res.status_code == 200
        assert archive_res.json()["status"] == "archived"

        # 9. AI Draft endpoint
        draft_res = await client.post(
            "/api/admin/scenarios/ai-draft",
            json={"topic": "handling procurement pushback", "track": "sales"},
            headers={"Authorization": f"Bearer {auth_tokens['admin']}"},
        )
        assert draft_res.status_code == 200
        assert "draft-sales" in draft_res.json()["slug"]
