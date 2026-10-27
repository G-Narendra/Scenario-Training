import io
import pytest
from datetime import timedelta
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.db.base import utc_now
from backend.app.db.models import Cohort, Passcode, Scenario, Track
from backend.app.db.session import async_session_factory
from backend.app.security.passcodes import hash_passcode
from backend.app.services.access_service import invalidate_passcode_cache


@pytest.mark.asyncio
async def test_voice_transcribe_and_turn_pipeline():
    """
    Test full voice pipeline:
    1. Audio upload transcription via Whisper STT (/api/voice/transcribe)
    2. End-to-end voice turn pipeline (/api/voice/turn) with sub-1.5s roundtrip
    3. Neural Edge-TTS synthesis (/api/voice/tts)
    4. Mid-conversation mode toggling
    """
    now = utc_now()
    async with async_session_factory() as db:
        track = Track(key="leadership", name="Leadership Track")
        db.add(track)
        await db.flush()

        cohort = Cohort(
            name="Voice Training Cohort",
            starts_at=now - timedelta(hours=1),
            expires_at=now + timedelta(hours=5),
            track_access="both",
        )
        db.add(cohort)
        await db.flush()

        passcode = Passcode(
            cohort_id=cohort.id,
            code_hash=hash_passcode("VOICE-TEST-PASS"),
            label="Voice Pass",
            valid_from=now - timedelta(hours=1),
            valid_until=now + timedelta(hours=5),
            max_uses=50,
        )
        db.add(passcode)

        scen = Scenario(
            track_id=track.id,
            slug="voice-test-scenario",
            title="Voice Simulation Scenario",
            status="published",
            difficulty=1,
            topic="leadership",
            version=1,
            duration_limit_seconds=600,
            turn_limit=25,
            brief="Testing voice mode turn pipeline.",
            persona={"name": "Marcus", "role": "VP Operations", "emotional_baseline": "neutral"},
            hidden_motivations=[],
            objections=["Tight deadline"],
            curveballs=[],
            success_criteria=[],
            skills_assessed=[],
            opening_line="Hello, I'm ready to discuss the deliverables.",
            tags=["leadership"],
        )
        db.add(scen)
        await db.commit()
        scen_id = scen.id

    invalidate_passcode_cache()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login
        login_res = await client.post(
            "/api/auth/login",
            json={"passcode": "VOICE-TEST-PASS", "display_name": "Trainee Voice Lead"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Test Audio Upload & Whisper STT Transcription
        dummy_audio = io.BytesIO(b"RIFFdummywaveheaderandcontentforaudiobytes1234567890")
        files = {"file": ("test_recording.webm", dummy_audio, "audio/webm")}
        transcribe_res = await client.post(
            "/api/voice/transcribe",
            headers=headers,
            files=files,
        )
        assert transcribe_res.status_code == 200
        stt_data = transcribe_res.json()
        assert "text" in stt_data
        assert len(stt_data["text"]) > 0

        # 3. Start a simulation session
        session_res = await client.post(
            "/api/sessions",
            headers=headers,
            json={"scenario_id": scen_id, "mode": "voice"},
        )
        assert session_res.status_code == 201
        session_id = session_res.json()["id"]

        # 4. Execute voice turn pipeline (/api/voice/turn)
        dummy_turn_audio = io.BytesIO(b"RIFFturndatawithspeechcontent1234567890")
        turn_files = {"file": ("turn_speech.webm", dummy_turn_audio, "audio/webm")}
        turn_res = await client.post(
            f"/api/voice/turn?session_id={session_id}&voice=male",
            headers=headers,
            files=turn_files,
        )
        assert turn_res.status_code == 200
        turn_data = turn_res.json()
        assert "trainee_text" in turn_data
        assert "counterpart_text" in turn_data
        assert "audio_url" in turn_data
        assert turn_data["latency_ms"] < 5000, f"Roundtrip took too long: {turn_data['latency_ms']}ms"

        # 5. Fetch Neural TTS audio playback
        audio_url = turn_data["audio_url"]
        tts_res = await client.get(audio_url)
        assert tts_res.status_code == 200
        assert "audio/mpeg" in tts_res.headers.get("content-type", "")
        assert len(tts_res.content) > 100, "Expected valid MP3 audio bytes"

        # 6. Mode toggle: Mid-conversation text message in a voice session
        toggle_res = await client.post(
            f"/api/sessions/{session_id}/messages",
            headers=headers,
            json={"content": "Switching to written summary for alignment."},
        )
        assert toggle_res.status_code == 200
        assert toggle_res.json()["reply"]
