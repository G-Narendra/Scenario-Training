from unittest.mock import patch

import httpx
import pytest

from backend.app.ai.providers.anthropic_provider import AnthropicProvider
from backend.app.ai.providers.base import LLMMessage, LLMProviderError
from backend.app.ai.providers.openai_provider import OpenAIProvider


class FakeStreamingResponse:
    def __init__(self, lines, status_code=200):
        self._lines = lines
        self.status_code = status_code

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

    async def aread(self):
        return b"Error payload"

    async def aiter_lines(self):
        for line in self._lines:
            yield line


@pytest.mark.asyncio
async def test_anthropic_stream_chat_success():
    provider = AnthropicProvider(api_key="sk-ant-test")
    messages = [LLMMessage(role="user", content="Hi")]

    lines = [
        'data: {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "Hello "}}',
        'data: {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "there!"}}',
        "data: [DONE]",
    ]

    fake_stream = FakeStreamingResponse(lines)

    with patch("httpx.AsyncClient.stream", return_value=fake_stream):
        tokens = []
        async for token in provider.stream_chat(messages, "System prompt"):
            tokens.append(token)

        assert "".join(tokens) == "Hello there!"


@pytest.mark.asyncio
async def test_anthropic_stream_chat_errors():
    provider = AnthropicProvider(api_key="sk-ant-test")
    messages = [LLMMessage(role="user", content="Hi")]

    # HTTP error status
    fake_stream_err = FakeStreamingResponse([], status_code=500)
    with patch("httpx.AsyncClient.stream", return_value=fake_stream_err):
        with pytest.raises(LLMProviderError, match="Anthropic streaming API error 500"):
            async for _ in provider.stream_chat(messages, "System"):
                pass

    # Timeout
    with patch("httpx.AsyncClient.stream", side_effect=httpx.TimeoutException("Timeout")):
        with pytest.raises(LLMProviderError, match="timed out"):
            async for _ in provider.stream_chat(messages, "System"):
                pass

    # RequestError
    with patch("httpx.AsyncClient.stream", side_effect=httpx.RequestError("Connection failed")):
        with pytest.raises(LLMProviderError, match="connection error"):
            async for _ in provider.stream_chat(messages, "System"):
                pass


@pytest.mark.asyncio
async def test_openai_stream_chat_success():
    provider = OpenAIProvider(api_key="sk-test")
    messages = [LLMMessage(role="user", content="Hi")]

    lines = [
        'data: {"choices": [{"delta": {"content": "Hello "}}]}',
        'data: {"choices": [{"delta": {"content": "world!"}}]}',
        "data: [DONE]",
    ]

    fake_stream = FakeStreamingResponse(lines)

    with patch("httpx.AsyncClient.stream", return_value=fake_stream):
        tokens = []
        async for token in provider.stream_chat(messages, "System prompt"):
            tokens.append(token)

        assert "".join(tokens) == "Hello world!"


@pytest.mark.asyncio
async def test_openai_stream_chat_errors():
    provider = OpenAIProvider(api_key="sk-test")
    messages = [LLMMessage(role="user", content="Hi")]

    # HTTP error status
    fake_stream_err = FakeStreamingResponse([], status_code=429)
    with patch("httpx.AsyncClient.stream", return_value=fake_stream_err):
        with pytest.raises(LLMProviderError, match="OpenAI streaming error 429"):
            async for _ in provider.stream_chat(messages, "System"):
                pass

    # Timeout
    with patch("httpx.AsyncClient.stream", side_effect=httpx.TimeoutException("Timeout")):
        with pytest.raises(LLMProviderError, match="timed out"):
            async for _ in provider.stream_chat(messages, "System"):
                pass

    # RequestError
    with patch("httpx.AsyncClient.stream", side_effect=httpx.RequestError("Network drop")):
        with pytest.raises(LLMProviderError, match="connection error"):
            async for _ in provider.stream_chat(messages, "System"):
                pass
