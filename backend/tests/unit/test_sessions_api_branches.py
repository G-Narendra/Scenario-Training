import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.db.models import (
    AuthSession,
    Cohort,
    Message,
    Scenario,
    SimulationSession,
    Track,
    User,
)
from backend.app.db.session import async_session_factory
from backend.app.main import app
from backend.app.security.passcodes import hash_token
from backend.app.security.tokens import create_access_token


@pytest.fixture
async def setup_sessions_branch_data():
    async with async_session_factory() as db:
        now = datetime.now(timezone.utc)
        cohort = Cohort(name="Sessions Cohort", expires_at=now + timedelta(days=30))
        db.add(cohort)
        await db.flush()

        trainee = User(display_name="Trainee S1", role="trainee", cohort_id=cohort.id)
        other_trainee = User(display_name="Trainee S2", role="trainee", cohort_id=cohort.id)
        group_admin = User(display_name="Admin S", role="group_admin", cohort_id=cohort.id)
        db.add_all([trainee, other_trainee, group_admin])
        await db.flush()

        track = Track(key="sales", name="Sales Track")
        db.add(track)
        await db.flush()

        scenario = Scenario(
            track_id=track.id,
            slug="sessions-branch-scenario",
            title="Sessions Branch Scenario",
            status="published",
            difficulty=2,
            topic="objection_handling",
            duration_limit_seconds=600,
            turn_limit=10,
            brief="Testing sessions api branches.",
            persona={"name": "Chris", "role": "Buyer", "communication_style": "Fast"},
            hidden_motivations=["Budget bound"],
            objections=["Competitor is cheaper"],
            success_criteria=["Address price with ROI"],
            skills_assessed=[{"skill": "objection_handling", "weight": 1.0}],
            opening_line="We received a lower bid.",
        )
        db.add(scenario)
        await db.flush()

        sess = SimulationSession(
            user_id=trainee.id,
            scenario_id=scenario.id,
            mode="text",
            status="active",
        )
        db.add(sess)
        await db.flush()

        # Add initial opening message
        opening = Message(
            session_id=sess.id,
            seq=1,
            role="counterpart",
            content="We received a lower bid.",
        )
        db.add(opening)

        t1_tok, _, _ = create_access_token(trainee.id, trainee.role)
        t2_tok, _, _ = create_access_token(other_trainee.id, other_trainee.role)
        ga_tok, _, _ = create_access_token(group_admin.id, group_admin.role)

        for u, tok in [(trainee, t1_tok), (other_trainee, t2_tok), (group_admin, ga_tok)]:
            db.add(
                AuthSession(
                    user_id=u.id, token_hash=hash_token(tok), expires_at=now + timedelta(hours=12)
                )
            )
        await db.commit()

        return {
            "session_id": sess.id,
            "scenario_id": scenario.id,
            "t1_token": t1_tok,
            "t2_token": t2_tok,
            "ga_token": ga_tok,
        }


@pytest.mark.asyncio
async def test_sessions_message_streaming_sse_and_auth_checks(setup_sessions_branch_data):
    data = setup_sessions_branch_data
    sess_id = data["session_id"]
    t1_headers = {"Authorization": f"Bearer {data['t1_token']}"}
    t2_headers = {"Authorization": f"Bearer {data['t2_token']}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Trainee 2 tries to send message to Trainee 1 session -> 404
        r = await ac.post(
            f"/api/sessions/{sess_id}/messages",
            headers=t2_headers,
            json={"content": "Should fail"},
        )
        assert r.status_code == 404

        # 2. Trainee 1 sends message with Accept: text/event-stream -> SSE response
        r = await ac.post(
            f"/api/sessions/{sess_id}/messages",
            headers={**t1_headers, "Accept": "text/event-stream"},
            json={"content": "What matters most besides price?"},
        )
        assert r.status_code == 200
        assert "text/event-stream" in r.headers["content-type"]
        assert "data: " in r.text
        assert "[DONE]" in r.text

        # 3. List sessions with mine=true and group admin cohort view
        r = await ac.get("/api/sessions?mine=true", headers=t1_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1

        r_admin = await ac.get(
            "/api/sessions", headers={"Authorization": f"Bearer {data['ga_token']}"}
        )
        assert r_admin.status_code == 200
        assert len(r_admin.json()) >= 1

        # 4. Evaluation 404 on nonexistent session
        fake_id = str(uuid.uuid4())
        r_eval_404 = await ac.get(f"/api/sessions/{fake_id}/evaluation", headers=t1_headers)
        assert r_eval_404.status_code == 404

        # 5. Evaluation 403 on another user's session
        r_eval_403 = await ac.get(f"/api/sessions/{sess_id}/evaluation", headers=t2_headers)
        assert r_eval_403.status_code == 403

        # 6. Evaluation POST 404 and 403
        r_post_404 = await ac.post(f"/api/sessions/{fake_id}/evaluation", headers=t1_headers)
        assert r_post_404.status_code == 404

        r_post_403 = await ac.post(f"/api/sessions/{sess_id}/evaluation", headers=t2_headers)
        assert r_post_403.status_code == 403

        # 7. Get session detail & messages
        r_detail = await ac.get(f"/api/sessions/{sess_id}", headers=t1_headers)
        assert r_detail.status_code == 200
        assert r_detail.json()["id"] == sess_id

        r_msgs = await ac.get(f"/api/sessions/{sess_id}/messages", headers=t1_headers)
        assert r_msgs.status_code == 200
        assert len(r_msgs.json()) >= 1

        # 8. End session
        r_end = await ac.post(f"/api/sessions/{sess_id}/end", headers=t1_headers)
        assert r_end.status_code == 200
        assert r_end.json()["status"] == "completed"

        # 9. Generate evaluation on concluded session
        r_eval_gen = await ac.post(f"/api/sessions/{sess_id}/evaluation", headers=t1_headers)
        assert r_eval_gen.status_code == 200
        assert "overall_score" in r_eval_gen.json() or "overall_summary" in r_eval_gen.json()

        # 10. Get generated evaluation
        r_eval_get = await ac.get(f"/api/sessions/{sess_id}/evaluation", headers=t1_headers)
        assert r_eval_get.status_code == 200

        # 11. Create session with nonexistent scenario -> 404
        r_create_404 = await ac.post(
            "/api/sessions", headers=t1_headers, json={"scenario_id": fake_id, "mode": "text"}
        )
        assert r_create_404.status_code == 404

        # 12. Create valid session via API
        r_create = await ac.post(
            "/api/sessions",
            headers=t1_headers,
            json={"scenario_id": data["scenario_id"], "mode": "text"},
        )
        assert r_create.status_code == 201
        new_sess_id = r_create.json()["id"]

        # 13. Send standard JSON message (non-SSE)
        r_msg_json = await ac.post(
            f"/api/sessions/{new_sess_id}/messages",
            headers=t1_headers,
            json={"content": "Can we schedule a call to review details?"},
        )
        assert r_msg_json.status_code == 200
        assert "reply" in r_msg_json.json()
