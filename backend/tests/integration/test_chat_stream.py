from datetime import timedelta
import json
import pytest
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.db.base import utc_now
from backend.app.db.models import Cohort, Passcode, Scenario, Track
from backend.app.db.session import async_session_factory
from backend.app.security.passcodes import hash_passcode
from backend.app.services.access_service import invalidate_passcode_cache


@pytest.mark.asyncio
async def test_chat_sse_stream_endpoint():
    """
    Test SSE endpoint (/api/chat/stream):
    1. Instant token streaming with data: {"chunk": "..."}
    2. Graceful stream completion with data: {"done": true}
    3. Error handling on nonexistent session (404)
    """
    now = utc_now()
    async with async_session_factory() as db:
        track = Track(key="leadership", name="Leadership Track")
        db.add(track)
        await db.flush()

        cohort = Cohort(
            name="Chat Stream Cohort",
            starts_at=now - timedelta(hours=1),
            expires_at=now + timedelta(hours=5),
            track_access="both",
        )
        db.add(cohort)
        await db.flush()

        passcode = Passcode(
            cohort_id=cohort.id,
            code_hash=hash_passcode("CHAT-STREAM-PASS"),
            label="Chat Stream Pass",
            valid_from=now - timedelta(hours=1),
            valid_until=now + timedelta(hours=5),
            max_uses=50,
        )
        db.add(passcode)

        scen = Scenario(
            track_id=track.id,
            slug="chat-stream-scenario",
            title="Chat Stream Test Scenario",
            status="published",
            difficulty=1,
            topic="leadership",
            version=1,
            duration_limit_seconds=600,
            turn_limit=25,
            brief="Testing SSE token streaming.",
            persona={"name": "Alex", "role": "VP Operations"},
            hidden_motivations=[],
            objections=[],
            curveballs=[],
            success_criteria=[],
            skills_assessed=[],
            opening_line="Good morning. Let's get straight to it.",
            tags=["leadership"],
        )
        db.add(scen)
        await db.commit()
        scen_id = scen.id

    invalidate_passcode_cache()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Login
        login_res = await client.post(
            "/api/auth/login",
            json={"passcode": "CHAT-STREAM-PASS", "display_name": "Trainee Streamer"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Start session
        session_res = await client.post(
            "/api/sessions",
            headers=headers,
            json={"scenario_id": scen_id, "mode": "text"},
        )
        assert session_res.status_code == 201
        session_id = session_res.json()["id"]

        # 1. Stream turn via /api/chat/stream
        stream_res = await client.post(
            "/api/chat/stream",
            headers=headers,
            json={"session_id": session_id, "content": "How are the operational timelines looking?"},
        )
        assert stream_res.status_code == 200
        assert "text/event-stream" in stream_res.headers.get("content-type", "")

        lines = stream_res.text.strip().split("\n")
        chunks = []
        is_done = False

        for line in lines:
            line = line.strip()
            if line.startswith("data: "):
                payload = json.loads(line[6:])
                if "chunk" in payload:
                    chunks.append(payload["chunk"])
                if payload.get("done") is True:
                    is_done = True

        assert len(chunks) > 0, "Expected streamed chunk tokens"
        assert is_done is True, "Expected stream termination flag done=True"

        # 2. Error handling: Non-existent session returns 404
        bad_res = await client.post(
            "/api/chat/stream",
            headers=headers,
            json={"session_id": "non-existent-session-id", "content": "Hello?"},
        )
        assert bad_res.status_code == 404
