from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.db.models import AuthSession, Cohort, Scenario, Skill, Track, User
from backend.app.db.session import async_session_factory
from backend.app.main import app
from backend.app.schemas.evaluation import FeedbackReportSchema
from backend.app.security.passcodes import hash_token
from backend.app.security.tokens import create_access_token


@pytest.fixture
async def setup_eval_env():
    async with async_session_factory() as db:
        now = datetime.now(timezone.utc)
        cohort = Cohort(
            name="Eval Cohort",
            expires_at=now + timedelta(days=30),
        )
        db.add(cohort)
        await db.flush()

        trainee = User(display_name="Trainee Alice", role="trainee", cohort_id=cohort.id)
        other_trainee = User(display_name="Trainee Bob", role="trainee", cohort_id=cohort.id)
        db.add_all([trainee, other_trainee])
        await db.flush()

        track = Track(key="sales", name="Sales Track")
        db.add(track)
        await db.flush()

        skill_1 = Skill(
            track_id=track.id,
            key="discovery_questions",
            name="Discovery Questions",
            rubric={"1": "L1", "2": "L2", "3": "L3", "4": "L4", "5": "L5"},
        )
        skill_2 = Skill(
            track_id=track.id,
            key="objection_handling",
            name="Objection Handling",
            rubric={"1": "L1", "2": "L2", "3": "L3", "4": "L4", "5": "L5"},
        )
        db.add_all([skill_1, skill_2])
        await db.flush()

        scenario = Scenario(
            track_id=track.id,
            slug="eval-test-scenario",
            title="Price Defense Simulation",
            status="published",
            difficulty=3,
            topic="objection_handling",
            duration_limit_seconds=600,
            turn_limit=10,
            brief="Negotiate with Dana who wants a discount.",
            persona={
                "name": "Dana Whitfield",
                "role": "Procurement Director",
                "communication_style": "Direct, data-driven",
                "emotional_baseline": "guarded",
            },
            hidden_motivations=["CFO cost cut mandate of 10%"],
            objections=["Your pricing is 20% higher than competitor"],
            success_criteria=["Uncover CFO mandate", "Secure follow-up"],
            skills_assessed=[
                {"skill": "discovery_questions", "weight": 0.5},
                {"skill": "objection_handling", "weight": 0.5},
            ],
            opening_line="We have a cheaper offer on the table.",
        )
        db.add(scenario)
        await db.flush()

        # Auth tokens
        token_alice, _, _ = create_access_token(trainee.id, trainee.role)
        token_bob, _, _ = create_access_token(other_trainee.id, other_trainee.role)

        sess_alice = AuthSession(
            user_id=trainee.id,
            token_hash=hash_token(token_alice),
            expires_at=now + timedelta(hours=12),
        )
        sess_bob = AuthSession(
            user_id=other_trainee.id,
            token_hash=hash_token(token_bob),
            expires_at=now + timedelta(hours=12),
        )
        db.add_all([sess_alice, sess_bob])
        await db.commit()

        return {
            "scenario_id": scenario.id,
            "alice_headers": {"Authorization": f"Bearer {token_alice}"},
            "bob_headers": {"Authorization": f"Bearer {token_bob}"},
        }


@pytest.mark.asyncio
async def test_session_evaluation_end_to_end(setup_eval_env):
    """Verify full lifecycle from session creation to message exchange, end, and evaluation generation."""
    scenario_id = setup_eval_env["scenario_id"]
    headers = setup_eval_env["alice_headers"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Start simulation session
        create_resp = await client.post(
            "/api/sessions",
            json={"scenario_id": scenario_id, "mode": "text"},
            headers=headers,
        )
        assert create_resp.status_code == 201
        session_id = create_resp.json()["id"]

        # 2. Exchange a message
        msg_resp = await client.post(
            f"/api/sessions/{session_id}/messages",
            json={"content": "Could you share what your top priorities are for this quarter?"},
            headers={**headers, "Accept": "application/json"},
        )
        assert msg_resp.status_code == 200

        # 3. End session
        end_resp = await client.post(
            f"/api/sessions/{session_id}/end",
            headers=headers,
        )
        assert end_resp.status_code == 200

        # 4. Request Evaluation Report
        eval_resp = await client.get(
            f"/api/sessions/{session_id}/evaluation",
            headers=headers,
        )
        assert eval_resp.status_code == 200
        report_json = eval_resp.json()

        # Validate strictly via Pydantic model
        report = FeedbackReportSchema(**report_json)
        assert report.overall_score is not None
        assert 0 <= report.overall_score <= 100
        assert len(report.skill_scores) >= 1
        assert len(report.what_worked) >= 1
        assert len(report.what_didnt) >= 1
        assert len(report.key_moments) >= 3
        assert len(report.improvement_steps) in [3, 4]
        assert report.hidden_reveal != ""
        assert all(k.reasoning.startswith("This works better because") for k in report.key_moments)

        # 5. Idempotent retrieval returns cached evaluation
        eval_resp_2 = await client.get(
            f"/api/sessions/{session_id}/evaluation",
            headers=headers,
        )
        assert eval_resp_2.status_code == 200
        assert eval_resp_2.json()["overall_score"] == report.overall_score

        # 6. Regenerate evaluation via POST
        regen_resp = await client.post(
            f"/api/sessions/{session_id}/evaluation",
            headers=headers,
        )
        assert regen_resp.status_code == 200
        assert regen_resp.json()["overall_score"] is not None


@pytest.mark.asyncio
async def test_session_evaluation_unauthorized_access(setup_eval_env):
    """Verify that a trainee cannot access evaluation reports for sessions owned by other users."""
    scenario_id = setup_eval_env["scenario_id"]
    alice_headers = setup_eval_env["alice_headers"]
    bob_headers = setup_eval_env["bob_headers"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create session as Alice
        create_resp = await client.post(
            "/api/sessions",
            json={"scenario_id": scenario_id, "mode": "text"},
            headers=alice_headers,
        )
        session_id = create_resp.json()["id"]

        # End session
        await client.post(f"/api/sessions/{session_id}/end", headers=alice_headers)

        # Attempt access as Bob (should be 403 Forbidden)
        forbidden_resp = await client.get(
            f"/api/sessions/{session_id}/evaluation",
            headers=bob_headers,
        )
        assert forbidden_resp.status_code == 403
