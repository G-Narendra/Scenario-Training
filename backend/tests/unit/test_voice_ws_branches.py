import json
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from starlette.testclient import TestClient

from backend.app.db.models import AuthSession, Cohort, Scenario, SimulationSession, Track, User
from backend.app.db.session import async_session_factory
from backend.app.main import app
from backend.app.security.passcodes import hash_token
from backend.app.security.tokens import create_access_token


@pytest.fixture
async def setup_branch_session():
    async with async_session_factory() as db:
        now = datetime.now(timezone.utc)
        cohort = Cohort(name="Branch Cohort", expires_at=now + timedelta(days=30))
        db.add(cohort)
        await db.flush()

        trainee = User(display_name="Trainee One", role="trainee", cohort_id=cohort.id)
        other_user = User(display_name="Other User", role="trainee", cohort_id=cohort.id)
        db.add_all([trainee, other_user])
        await db.flush()

        track = Track(key="leadership", name="Leadership Track")
        db.add(track)
        await db.flush()

        scenario = Scenario(
            track_id=track.id,
            slug="branch-scenario",
            title="Branch Leadership Scenario",
            status="published",
            difficulty=3,
            topic="feedback",
            duration_limit_seconds=600,
            turn_limit=5,
            brief="Testing voice branches.",
            persona={"name": "Morgan", "role": "Lead", "communication_style": "Direct"},
            hidden_motivations=["Secret motivation"],
            objections=["Resource constraint"],
            success_criteria=["Active listening"],
            skills_assessed=[{"skill": "clarity", "weight": 1.0}],
            opening_line="Let's review the branch updates.",
        )
        db.add(scenario)
        await db.flush()

        active_session = SimulationSession(
            user_id=trainee.id,
            scenario_id=scenario.id,
            mode="voice",
            status="active",
        )
        closed_session = SimulationSession(
            user_id=trainee.id,
            scenario_id=scenario.id,
            mode="voice",
            status="completed",
        )
        db.add_all([active_session, closed_session])
        await db.flush()

        trainee_token, _, _ = create_access_token(trainee.id, trainee.role)
        other_token, _, _ = create_access_token(other_user.id, other_user.role)

        for u_id, tok in [(trainee.id, trainee_token), (other_user.id, other_token)]:
            db.add(
                AuthSession(
                    user_id=u_id,
                    token_hash=hash_token(tok),
                    expires_at=now + timedelta(hours=12),
                )
            )
        await db.commit()

        return {
            "active_session_id": active_session.id,
            "closed_session_id": closed_session.id,
            "trainee_token": trainee_token,
            "other_token": other_token,
        }


def test_voice_ws_nonexistent_session(setup_branch_session):
    client = TestClient(app)
    fake_id = str(uuid.uuid4())
    token = setup_branch_session["trainee_token"]

    with client.websocket_connect(f"/api/sessions/{fake_id}/voice") as ws:
        ws.send_text(json.dumps({"type": "session.start", "token": token}))
        err = json.loads(ws.receive_text())
        assert err["type"] == "error"
        assert "not found" in err["message"].lower()


def test_voice_ws_closed_session(setup_branch_session):
    client = TestClient(app)
    session_id = setup_branch_session["closed_session_id"]
    token = setup_branch_session["trainee_token"]

    with client.websocket_connect(f"/api/sessions/{session_id}/voice") as ws:
        ws.send_text(json.dumps({"type": "session.start", "token": token}))
        err = json.loads(ws.receive_text())
        assert err["type"] == "error"
        assert "closed" in err["message"].lower() or "not active" in err["message"].lower()


def test_voice_ws_unauthorized_user(setup_branch_session):
    client = TestClient(app)
    session_id = setup_branch_session["active_session_id"]
    wrong_token = setup_branch_session["other_token"]

    with client.websocket_connect(f"/api/sessions/{session_id}/voice") as ws:
        ws.send_text(json.dumps({"type": "session.start", "token": wrong_token}))
        err = json.loads(ws.receive_text())
        assert err["type"] == "error"
        assert "unauthorized" in err["message"].lower()


def test_voice_ws_token_in_query_param(setup_branch_session):
    client = TestClient(app)
    session_id = setup_branch_session["active_session_id"]
    token = setup_branch_session["trainee_token"]

    with client.websocket_connect(f"/api/sessions/{session_id}/voice?token={token}") as ws:
        ws.send_text(json.dumps({"type": "session.start"}))
        msg = json.loads(ws.receive_text())
        assert msg["type"] == "session.ready"
        assert msg["persona_name"] == "Morgan"

        # Unknown message handling
        ws.send_text(json.dumps({"type": "unknown_action_type"}))
        # End session cleanly
        ws.send_text(json.dumps({"type": "session.end"}))
        end_msg = json.loads(ws.receive_text())
        assert end_msg["type"] == "session.ended"
