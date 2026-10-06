from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.ai.providers import get_llm_provider
from backend.app.ai.providers.anthropic_provider import AnthropicProvider
from backend.app.ai.providers.base import LLMMessage, LLMProviderError
from backend.app.ai.providers.openai_provider import OpenAIProvider
from backend.app.db.models import AuthSession, Cohort, Scenario, SimulationSession, Track, User
from backend.app.db.session import async_session_factory
from backend.app.main import app
from backend.app.security.passcodes import hash_token
from backend.app.security.tokens import create_access_token


@pytest.fixture
async def setup_coverage_fixture():
    async with async_session_factory() as db:
        cohort = Cohort(
            name="Coverage Cohort",
            expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        )
        db.add(cohort)
        await db.flush()

        admin = User(display_name="Admin Chief", role="group_admin", cohort_id=cohort.id)
        trainee = User(display_name="Trainee Dan", role="trainee", cohort_id=cohort.id)
        db.add_all([admin, trainee])
        await db.flush()

        track = Track(key="leadership", name="Leadership Track")
        db.add(track)
        await db.flush()

        published_scen = Scenario(
            track_id=track.id,
            slug="coaching-underperformer",
            title="Coaching an Underperformer",
            status="published",
            difficulty=2,
            topic="coaching",
            duration_limit_seconds=600,
            turn_limit=10,
            brief="Your direct report is consistently missing sprint deadlines.",
            persona={
                "name": "Sam Taylor",
                "role": "Senior Engineer",
                "personality": ["defensive", "stressed"],
                "communication_style": "Blames others.",
                "emotional_baseline": "defensive",
            },
            hidden_motivations=["Overwhelmed by family obligations."],
            objections=["The specs were unclear."],
            curveballs=[],
            success_criteria=["Explore underlying root causes"],
            skills_assessed=[{"skill": "empathy", "weight": 1.0}],
            opening_line="I know why you set up this 1-on-1, but the delays aren't my fault.",
            tags=["leadership"],
            conclusion_signals={"positive": ["Agrees to plan"], "negative": ["Walks out"]},
        )
        draft_scen = Scenario(
            track_id=track.id,
            slug="draft-coaching-scenario",
            title="Draft Scenario Not Published",
            status="draft",
            difficulty=1,
            topic="coaching",
            brief="Unpublished draft scenario.",
            persona={
                "name": "Test",
                "role": "Test",
                "personality": ["test"],
                "communication_style": "test",
            },
            hidden_motivations=["Secret"],
            objections=["Obj"],
            curveballs=[],
            success_criteria=["Crit"],
            skills_assessed=[{"skill": "clarity", "weight": 1.0}],
            opening_line="Draft opening",
            tags=["draft"],
            conclusion_signals={},
        )
        db.add_all([published_scen, draft_scen])
        await db.commit()
        await db.refresh(published_scen)
        await db.refresh(draft_scen)

        t_token, _, _ = create_access_token(trainee.id, trainee.role)
        a_token, _, _ = create_access_token(admin.id, admin.role)

        exp = datetime.now(timezone.utc) + timedelta(hours=12)
        db.add(AuthSession(user_id=trainee.id, token_hash=hash_token(t_token), expires_at=exp))
        db.add(AuthSession(user_id=admin.id, token_hash=hash_token(a_token), expires_at=exp))
        await db.commit()

        return {
            "published_id": published_scen.id,
            "draft_id": draft_scen.id,
            "trainee_token": t_token,
            "admin_token": a_token,
            "trainee_id": trainee.id,
            "admin_id": admin.id,
        }


@pytest.mark.asyncio
async def test_session_sse_streaming_and_listing(setup_coverage_fixture):
    data = setup_coverage_fixture
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Start session
        res = await client.post(
            "/api/sessions",
            json={"scenario_id": data["published_id"], "mode": "text"},
            headers={"Authorization": f"Bearer {data['trainee_token']}"},
        )
        assert res.status_code == 201
        session_id = res.json()["id"]

        # 2. Send message with SSE streaming accept header
        sse_res = await client.post(
            f"/api/sessions/{session_id}/messages",
            json={"content": "I understand you're stressed. Let's look at what's going on."},
            headers={
                "Authorization": f"Bearer {data['trainee_token']}",
                "Accept": "text/event-stream",
            },
        )
        assert sse_res.status_code == 200
        assert "text/event-stream" in sse_res.headers.get("content-type", "")
        body = sse_res.text
        assert "data: " in body
        assert "[DONE]" in body

        # 3. List sessions for current trainee
        list_res = await client.get(
            "/api/sessions?mine=true",
            headers={"Authorization": f"Bearer {data['trainee_token']}"},
        )
        assert list_res.status_code == 200
        items = list_res.json()
        assert len(items) >= 1
        assert items[0]["id"] == session_id

        # 4. List sessions as group admin (cohort sessions)
        admin_list_res = await client.get(
            "/api/sessions?mine=false",
            headers={"Authorization": f"Bearer {data['admin_token']}"},
        )
        assert admin_list_res.status_code == 200
        admin_items = admin_list_res.json()
        assert len(admin_items) >= 1

        # 5. Try starting session on draft scenario -> 400
        draft_start = await client.post(
            "/api/sessions",
            json={"scenario_id": data["draft_id"], "mode": "text"},
            headers={"Authorization": f"Bearer {data['trainee_token']}"},
        )
        assert draft_start.status_code == 400

        # 6. Try starting session on non-existent scenario -> 404
        nf_start = await client.post(
            "/api/sessions",
            json={"scenario_id": "non-existent-uuid", "mode": "text"},
            headers={"Authorization": f"Bearer {data['trainee_token']}"},
        )
        assert nf_start.status_code == 404


@pytest.mark.asyncio
async def test_session_time_limit_expiration(setup_coverage_fixture):
    data = setup_coverage_fixture
    # Create an already expired session in database
    async with async_session_factory() as db:
        old_time = datetime.now(timezone.utc) - timedelta(seconds=700)
        expired_session = SimulationSession(
            user_id=data["trainee_id"],
            scenario_id=data["published_id"],
            scenario_version=1,
            mode="text",
            status="active",
            started_at=old_time,
            state_metadata={"duration_limit_seconds": 600, "turn_limit": 10},
        )
        db.add(expired_session)
        await db.commit()
        await db.refresh(expired_session)
        expired_session_id = expired_session.id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Message on expired session triggers timeout
        timeout_res = await client.post(
            f"/api/sessions/{expired_session_id}/messages",
            json={"content": "Checking in after time elapsed."},
            headers={"Authorization": f"Bearer {data['trainee_token']}"},
        )
        assert timeout_res.status_code == 200
        assert timeout_res.json()["status"] == "timed_out"
        assert timeout_res.json()["end_reason"] == "time_limit"

        # Subsequent attempt to send message to closed session returns 400
        closed_res = await client.post(
            f"/api/sessions/{expired_session_id}/messages",
            json={"content": "Another message after closed."},
            headers={"Authorization": f"Bearer {data['trainee_token']}"},
        )
        assert closed_res.status_code == 400


@pytest.mark.asyncio
async def test_anthropic_and_openai_adapters_unit():
    anthropic = AnthropicProvider(api_key="test-key")
    openai = OpenAIProvider(api_key="test-key")

    messages = [
        LLMMessage(role="system", content="System instruction"),
        LLMMessage(role="user", content="User message"),
    ]

    # Verify message formatters
    anth_msgs = anthropic._format_messages(messages)
    assert len(anth_msgs) == 1
    assert anth_msgs[0]["role"] == "user"

    oai_msgs = openai._format_messages(messages, "System instruction")
    assert len(oai_msgs) == 2
    assert oai_msgs[0]["role"] == "system"

    # Missing API keys in factory raise clear LLMProviderError
    with patch("backend.app.config.settings.ANTHROPIC_API_KEY", None):
        with pytest.raises(LLMProviderError, match="ANTHROPIC_API_KEY is not configured"):
            get_llm_provider("anthropic")

    with patch("backend.app.config.settings.OPENAI_API_KEY", None):
        with pytest.raises(LLMProviderError, match="OPENAI_API_KEY is not configured"):
            get_llm_provider("openai")


@pytest.mark.asyncio
async def test_anthropic_complete_mocked_http():
    anthropic = AnthropicProvider(api_key="test-key")
    messages = [LLMMessage(role="user", content="Hello")]

    fake_response_data = {
        "content": [{"type": "text", "text": "Hello from Claude"}],
        "usage": {"input_tokens": 10, "output_tokens": 15},
        "stop_reason": "end_turn",
    }

    mock_resp = AsyncMock()
    mock_resp.status_code = 200
    mock_resp.json = lambda: fake_response_data

    with patch("httpx.AsyncClient.post", return_value=mock_resp):
        res = await anthropic.complete(messages, "System")
        assert res.content == "Hello from Claude"
        assert res.prompt_tokens == 10
        assert res.completion_tokens == 15
        assert res.cost_estimate > 0.0

    # Error status code
    mock_err_resp = AsyncMock()
    mock_err_resp.status_code = 500
    mock_err_resp.text = "Internal error"
    with patch("httpx.AsyncClient.post", return_value=mock_err_resp):
        with pytest.raises(LLMProviderError):
            await anthropic.complete(messages, "System")


@pytest.mark.asyncio
async def test_openai_complete_mocked_http():
    openai = OpenAIProvider(api_key="test-key")
    messages = [LLMMessage(role="user", content="Hello")]

    fake_response_data = {
        "choices": [{"message": {"content": "Hello from GPT-4o"}, "finish_reason": "stop"}],
        "usage": {"prompt_tokens": 8, "completion_tokens": 12, "total_tokens": 20},
    }

    mock_resp = AsyncMock()
    mock_resp.status_code = 200
    mock_resp.json = lambda: fake_response_data

    with patch("httpx.AsyncClient.post", return_value=mock_resp):
        res = await openai.complete(messages, "System")
        assert res.content == "Hello from GPT-4o"
        assert res.prompt_tokens == 8
        assert res.completion_tokens == 12
        assert res.cost_estimate > 0.0

    # Error status code
    mock_err_resp = AsyncMock()
    mock_err_resp.status_code = 429
    mock_err_resp.text = "Rate limit"
    with patch("httpx.AsyncClient.post", return_value=mock_err_resp):
        with pytest.raises(LLMProviderError):
            await openai.complete(messages, "System")
