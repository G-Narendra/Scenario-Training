import json
import logging
from typing import AsyncIterator, List

import httpx

from backend.app.ai.providers.base import LLMMessage, LLMProvider, LLMProviderError, LLMResponse

logger = logging.getLogger(__name__)


class AnthropicProvider(LLMProvider):
    """Anthropic Claude API provider adapter with streaming and token accounting."""

    def __init__(
        self,
        api_key: str,
        model: str = "claude-3-5-sonnet-20241022",
        timeout: float = 30.0,
    ):
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.base_url = "https://api.anthropic.com/v1/messages"
        # Cost per 1M tokens ($3 input, $15 output for Sonnet 3.5)
        self.input_cost_per_token = 3.0 / 1_000_000
        self.output_cost_per_token = 15.0 / 1_000_000

    def _format_messages(self, messages: List[LLMMessage]) -> List[dict]:
        formatted = []
        for m in messages:
            if m.role == "system":
                continue  # System prompt passed in separate top-level field
            role = "user" if m.role in ("user", "trainee") else "assistant"
            formatted.append({"role": role, "content": m.content})
        return formatted

    async def stream_chat(
        self,
        messages: List[LLMMessage],
        system_prompt: str,
        max_tokens: int = 1000,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": self.model,
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": self._format_messages(messages),
            "temperature": temperature,
            "stream": True,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                async with client.stream(
                    "POST", self.base_url, headers=headers, json=payload
                ) as response:
                    if response.status_code != 200:
                        body = await response.aread()
                        raise LLMProviderError(
                            f"Anthropic streaming API error {response.status_code}: {body.decode(errors='ignore')}",
                            status_code=response.status_code,
                            retryable=response.status_code in (429, 500, 502, 503, 504),
                        )

                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data: "):
                            continue
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            event = json.loads(data_str)
                            if event.get("type") == "content_block_delta":
                                delta = event.get("delta", {})
                                if delta.get("type") == "text_delta":
                                    yield delta.get("text", "")
                        except json.JSONDecodeError:
                            continue
            except httpx.TimeoutException:
                raise LLMProviderError(
                    "Anthropic API request timed out", status_code=504, retryable=True
                )
            except httpx.RequestError as e:
                raise LLMProviderError(f"Anthropic connection error: {str(e)}", retryable=True)

    async def complete(
        self,
        messages: List[LLMMessage],
        system_prompt: str,
        max_tokens: int = 1000,
        temperature: float = 0.7,
    ) -> LLMResponse:
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": self.model,
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": self._format_messages(messages),
            "temperature": temperature,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(self.base_url, headers=headers, json=payload)
                if response.status_code != 200:
                    raise LLMProviderError(
                        f"Anthropic API error {response.status_code}: {response.text}",
                        status_code=response.status_code,
                        retryable=response.status_code in (429, 500, 502, 503, 504),
                    )

                data = response.json()
                content = ""
                for block in data.get("content", []):
                    if block.get("type") == "text":
                        content += block.get("text", "")

                usage = data.get("usage", {})
                prompt_tokens = usage.get("input_tokens", 0)
                completion_tokens = usage.get("output_tokens", 0)
                total_tokens = prompt_tokens + completion_tokens
                cost = (prompt_tokens * self.input_cost_per_token) + (
                    completion_tokens * self.output_cost_per_token
                )

                return LLMResponse(
                    content=content,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=total_tokens,
                    cost_estimate=cost,
                    finish_reason=data.get("stop_reason", "stop"),
                )
            except httpx.TimeoutException:
                raise LLMProviderError(
                    "Anthropic API request timed out", status_code=504, retryable=True
                )
            except httpx.RequestError as e:
                raise LLMProviderError(f"Anthropic connection error: {str(e)}", retryable=True)
