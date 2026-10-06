import json
import logging
from typing import AsyncIterator, List

import httpx

from backend.app.ai.providers.base import LLMMessage, LLMProvider, LLMProviderError, LLMResponse

logger = logging.getLogger(__name__)


class OpenAIProvider(LLMProvider):
    """OpenAI-compatible LLM provider adapter with streaming and token accounting."""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.openai.com/v1/chat/completions",
        model: str = "gpt-4o",
        timeout: float = 30.0,
    ):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.timeout = timeout
        # Cost per 1M tokens ($2.50 input, $10.00 output for gpt-4o)
        self.input_cost_per_token = 2.50 / 1_000_000
        self.output_cost_per_token = 10.00 / 1_000_000

    def _format_messages(self, messages: List[LLMMessage], system_prompt: str) -> List[dict]:
        formatted = [{"role": "system", "content": system_prompt}]
        for m in messages:
            if m.role == "system":
                continue
            role = (
                "user"
                if m.role in ("user", "trainee")
                else ("assistant" if m.role == "counterpart" else m.role)
            )
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
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": self._format_messages(messages, system_prompt),
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
                            f"OpenAI streaming error {response.status_code}: {body.decode(errors='ignore')}",
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
                            choices = event.get("choices", [])
                            if choices:
                                delta = choices[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield content
                        except json.JSONDecodeError:
                            continue
            except httpx.TimeoutException:
                raise LLMProviderError(
                    "OpenAI API request timed out", status_code=504, retryable=True
                )
            except httpx.RequestError as e:
                raise LLMProviderError(f"OpenAI connection error: {str(e)}", retryable=True)

    async def complete(
        self,
        messages: List[LLMMessage],
        system_prompt: str,
        max_tokens: int = 1000,
        temperature: float = 0.7,
    ) -> LLMResponse:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": self._format_messages(messages, system_prompt),
            "temperature": temperature,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(self.base_url, headers=headers, json=payload)
                if response.status_code != 200:
                    raise LLMProviderError(
                        f"OpenAI API error {response.status_code}: {response.text}",
                        status_code=response.status_code,
                        retryable=response.status_code in (429, 500, 502, 503, 504),
                    )

                data = response.json()
                content = data["choices"][0]["message"]["content"]
                usage = data.get("usage", {})
                prompt_tokens = usage.get("prompt_tokens", 0)
                completion_tokens = usage.get("completion_tokens", 0)
                total_tokens = usage.get("total_tokens", prompt_tokens + completion_tokens)
                cost = (prompt_tokens * self.input_cost_per_token) + (
                    completion_tokens * self.output_cost_per_token
                )

                return LLMResponse(
                    content=content,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=total_tokens,
                    cost_estimate=cost,
                    finish_reason=data["choices"][0].get("finish_reason", "stop"),
                )
            except httpx.TimeoutException:
                raise LLMProviderError(
                    "OpenAI API request timed out", status_code=504, retryable=True
                )
            except httpx.RequestError as e:
                raise LLMProviderError(f"OpenAI connection error: {str(e)}", retryable=True)
