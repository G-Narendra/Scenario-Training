import os

import pytest

from backend.app.ai.providers import get_llm_provider
from backend.app.ai.providers.base import LLMMessage
from backend.app.config import settings

# Live provider tests run ONLY if explicitly enabled with RUN_LIVE_TESTS=1
pytestmark = pytest.mark.skipif(
    os.getenv("RUN_LIVE_TESTS", "0") != "1" and settings.RUN_LIVE_TESTS != 1,
    reason="Live provider tests disabled by default. Set RUN_LIVE_TESTS=1 with valid API key to enable.",
)


@pytest.mark.asyncio
async def test_live_anthropic_provider():
    if not settings.ANTHROPIC_API_KEY:
        pytest.skip("ANTHROPIC_API_KEY is not set.")

    provider = get_llm_provider("anthropic")
    messages = [
        LLMMessage(
            role="user", content="Respond in one short sentence as a busy procurement director."
        ),
    ]
    response = await provider.complete(
        messages, system_prompt="You are Dana, Procurement Director.", max_tokens=30
    )
    assert response.content
    assert response.total_tokens > 0
    assert response.cost_estimate > 0.0


@pytest.mark.asyncio
async def test_live_openai_provider():
    if not settings.OPENAI_API_KEY:
        pytest.skip("OPENAI_API_KEY is not set.")

    provider = get_llm_provider("openai")
    messages = [
        LLMMessage(
            role="user", content="Respond in one short sentence as an analytical executive."
        ),
    ]
    response = await provider.complete(
        messages, system_prompt="You are Alex, VP Operations.", max_tokens=30
    )
    assert response.content
    assert response.total_tokens > 0
    assert response.cost_estimate > 0.0
