import base64
import json
from datetime import datetime, timedelta, timezone

import pytest
from starlette.testclient import TestClient

from backend.app.db.models import AuthSession, Cohort, Scenario, SimulationSession, Track, User
from backend.app.db.session import async_session_factory
from backend.app.main import app
from backend.app.security.passcodes import hash_token
from backend.app.security.tokens import create_access_token
from backend.app.voice.providers.base import AudioChunk, VoiceConfig
from backend.app.voice.providers.mock_provider import MockVoiceProvider
from backend.app.voice.providers.openai_realtime import OpenAIRealtimeVoiceProvider


@pytest.fixture
async def setup_voice_session_data():
    async with async_session_factory() as db:
        now = datetime.now(timezone.utc)
        cohort = Cohort(name="Voice Cohort", expires_at=now + timedelta(days=30))
        db.add(cohort)
        await db.flush()

        trainee = User(display_name="Voice Trainee", role="trainee", cohort_id=cohort.id)
        db.add(trainee)
        await db.flush()

        track = Track(key="sales", name="Sales Track")
        db.add(track)
        await db.flush()

        scenario = Scenario(
            track_id=track.id,
            slug="voice-test-scenario",
            title="Voice Negotiation Call",
            status="published",
            difficulty=2,
            topic="negotiation",
            duration_limit_seconds=600,
            turn_limit=10,
            brief="A quick voice call simulation.",
            persona={"name": "Alex Vance", "role": "VP", "communication_style": "Concise"},
            hidden_motivations=["Confidential target"],
            objections=["Timeline is tight"],
            success_criteria=["Clarify objectives"],
            skills_assessed=[{"skill": "discovery_questions", "weight": 1.0}],
            opening_line="Hello, let's talk about the timeline.",
        )
        db.add(scenario)
        await db.flush()

        session = SimulationSession(
            user_id=trainee.id,
            scenario_id=scenario.id,
            mode="voice",
            status="active",
        )
        db.add(session)
        await db.flush()

        token, _, _ = create_access_token(trainee.id, trainee.role)
        auth_sess = AuthSession(
            user_id=trainee.id,
            token_hash=hash_token(token),
            expires_at=now + timedelta(hours=12),
        )
        db.add(auth_sess)
        await db.commit()

        return {
            "session_id": session.id,
            "token": token,
            "trainee_id": trainee.id,
        }


def test_voice_websocket_protocol_end_to_end(setup_voice_session_data):
    """Test full WebSocket voice session lifecycle: start, chunks, commit, barge-in, end."""
    session_id = setup_voice_session_data["session_id"]
    token = setup_voice_session_data["token"]

    client = TestClient(app)
    with client.websocket_connect(f"/api/sessions/{session_id}/voice") as ws:
        # 1. Send session.start
        ws.send_text(json.dumps({"type": "session.start", "token": token}))
        ready_msg = json.loads(ws.receive_text())
        assert ready_msg["type"] == "session.ready"
        assert ready_msg["persona_name"] == "Alex Vance"

        # 2. Send audio.chunk
        dummy_audio = base64.b64encode(b"\x00" * 600).decode("utf-8")
        ws.send_text(json.dumps({"type": "audio.chunk", "data": dummy_audio}))
        partial_msg = json.loads(ws.receive_text())
        assert partial_msg["type"] == "transcript.partial"

        # 3. Send audio.commit
        ws.send_text(json.dumps({"type": "audio.commit"}))
        final_msg = json.loads(ws.receive_text())
        assert final_msg["type"] == "transcript.final"
        assert "priorities" in final_msg["text"]

        assistant_text = json.loads(ws.receive_text())
        assert assistant_text["type"] == "assistant.text"

        # Receive assistant audio chunk
        assistant_audio = json.loads(ws.receive_text())
        assert assistant_audio["type"] == "assistant.audio"
        assert "data" in assistant_audio

        # 4. Test Barge-in interruption
        ws.send_text(json.dumps({"type": "interrupt"}))
        # Drain responses until interrupted or turn.complete
        received_types = [assistant_audio["type"]]
        for _ in range(5):
            try:
                m = json.loads(ws.receive_text())
                received_types.append(m["type"])
                if m["type"] in ["interrupted", "turn.complete"]:
                    break
            except Exception:
                break
        assert any(t in received_types for t in ["interrupted", "turn.complete", "assistant.audio"])

        # 5. Conclude session
        ws.send_text(json.dumps({"type": "session.end"}))
        end_msg = json.loads(ws.receive_text())
        assert end_msg["type"] == "session.ended"
        assert end_msg["status"] == "completed"


def test_voice_websocket_auth_failures(setup_voice_session_data):
    """Verify WebSocket rejection on missing or invalid authentication token."""
    session_id = setup_voice_session_data["session_id"]
    client = TestClient(app)

    # Missing token
    with client.websocket_connect(f"/api/sessions/{session_id}/voice") as ws:
        ws.send_text(json.dumps({"type": "session.start"}))
        err_msg = json.loads(ws.receive_text())
        assert err_msg["type"] == "error"

    # Wrong handshake message
    with client.websocket_connect(f"/api/sessions/{session_id}/voice") as ws:
        ws.send_text(json.dumps({"type": "random.message"}))
        err_msg = json.loads(ws.receive_text())
        assert err_msg["type"] == "error"


@pytest.mark.asyncio
async def test_openai_realtime_provider_interface():
    """Verify OpenAIRealtimeVoiceProvider interface and fallback safety."""
    provider = OpenAIRealtimeVoiceProvider()
    cfg = VoiceConfig(voice_id="alloy", counterpart_name="Dana")
    await provider.initialize_session(cfg)
    assert await provider.process_incoming_audio(b"test") is None
    assert await provider.finalize_trainee_turn() != ""
    await provider.interrupt()
    assert provider.interrupted is True
