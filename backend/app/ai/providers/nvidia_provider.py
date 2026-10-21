import asyncio
import json
import logging
from typing import AsyncIterator, List, Optional, Union

import httpx

from backend.app.ai.providers.base import LLMMessage, LLMProvider, LLMProviderError, LLMResponse

logger = logging.getLogger(__name__)


class NVIDIAProvider(LLMProvider):
    """
    High-concurrency NVIDIA NIM LLM provider adapter with multi-key round-robin load balancing,
    persistent HTTP connection pooling, and automatic 429 rate-limit failover across API keys.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_keys: Optional[Union[str, List[str]]] = None,
        base_url: str = "https://integrate.api.nvidia.com/v1/chat/completions",
        model: str = "meta/llama-3.2-11b-vision-instruct",
        timeout: float = 30.0,
    ):
        # Resolve all provided API keys into a clean list
        resolved_keys: List[str] = []
        if api_keys:
            if isinstance(api_keys, str):
                resolved_keys.extend([k.strip() for k in api_keys.split(",") if k.strip()])
            elif isinstance(api_keys, (list, tuple)):
                resolved_keys.extend([str(k).strip() for k in api_keys if str(k).strip()])
        if api_key and api_key not in resolved_keys:
            resolved_keys.insert(0, api_key.strip())

        # Eliminate duplicates preserving order
        self.api_keys: List[str] = list(dict.fromkeys(resolved_keys))
        if not self.api_keys:
            raise LLMProviderError("No valid NVIDIA API keys configured", retryable=False)

        self.base_url = base_url
        self.model = model
        self.timeout = timeout
        self.input_cost_per_token = 0.0
        self.output_cost_per_token = 0.0

        self._key_index = 0
        self._key_lock = asyncio.Lock()
        
        # High-concurrency persistent HTTP client with connection pooling
        self._client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.AsyncClient:
        """Retrieve or lazily initialize the shared persistent HTTP client with connection pooling."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(self.timeout, connect=10.0),
                limits=httpx.Limits(max_keepalive_connections=60, max_connections=120, keepalive_expiry=60.0),
            )
        return self._client

    async def _get_ordered_keys(self) -> List[str]:
        """Atomically select the next round-robin key and return all keys ordered starting with it."""
        async with self._key_lock:
            start_idx = self._key_index
            self._key_index = (self._key_index + 1) % len(self.api_keys)
        # Rotate list so start_idx is first, followed by others as failover backups
        return self.api_keys[start_idx:] + self.api_keys[:start_idx]

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
        max_tokens: int = 600,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        """
        Stream chat completion with round-robin multi-key balancing and instant 429 failover.
        """
        candidate_keys = await self._get_ordered_keys()
        payload = {
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": self._format_messages(messages, system_prompt),
            "temperature": temperature,
            "stream": True,
        }

        client = self._get_client()
        last_error: Optional[Exception] = None

        for attempt, key in enumerate(candidate_keys):
            masked_key = f"...{key[-8:]}" if len(key) >= 8 else "key"
            headers = {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            }

            try:
                logger.info(f"[NVIDIA Multi-Key Pool] Routing stream turn to key #{attempt + 1}/{len(candidate_keys)} ({masked_key})")
                # Fast 5s per-key timeout to keep conversation snappy and prevent user stalls
                async with client.stream("POST", self.base_url, headers=headers, json=payload, timeout=httpx.Timeout(5.0, connect=2.5, read=5.0)) as response:
                    if response.status_code != 200:
                        body = await response.aread()
                        logger.warning(
                            f"[NVIDIA Multi-Key Pool] Key #{attempt + 1} ({masked_key}) failed with status {response.status_code}. Failing over to next key..."
                        )
                        last_error = LLMProviderError(
                            f"NVIDIA NIM error {response.status_code}: {body.decode(errors='ignore')}",
                            status_code=response.status_code,
                            retryable=True,
                        )
                        continue  # Try next key in candidate list!

                    # Successful connection: stream tokens
                    received_tokens = False
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
                                content = delta.get("content") or delta.get("reasoning_content") or ""
                                if content:
                                    received_tokens = True
                                    yield content
                        except json.JSONDecodeError:
                            continue

                    if received_tokens:
                        return  # Streaming completed successfully!

            except (httpx.TimeoutException, httpx.RequestError) as te:
                logger.warning(f"[NVIDIA Multi-Key Pool] Key #{attempt + 1} ({masked_key}) network issue ({te}). Failing over to next key...")
                last_error = te
                continue

        # If all keys in the pool were exhausted
        if last_error:
            logger.error(f"[NVIDIA Multi-Key Pool] All {len(candidate_keys)} keys failed: {last_error}")
            raise LLMProviderError(f"All {len(candidate_keys)} NVIDIA NIM keys failed: {str(last_error)}", retryable=True)

    async def complete(
        self,
        messages: List[LLMMessage],
        system_prompt: str,
        max_tokens: int = 2500,
        temperature: float = 0.7,
    ) -> LLMResponse:
        """
        Complete full chat response with multi-key round-robin rotation and failover.
        """
        candidate_keys = await self._get_ordered_keys()
        payload = {
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": self._format_messages(messages, system_prompt),
            "temperature": temperature,
        }

        client = self._get_client()
        last_error: Optional[Exception] = None

        for attempt, key in enumerate(candidate_keys):
            masked_key = f"...{key[-8:]}" if len(key) >= 8 else "key"
            headers = {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            }

            try:
                response = await client.post(self.base_url, headers=headers, json=payload, timeout=httpx.Timeout(7.0, connect=2.5, read=7.0))
                if response.status_code != 200:
                    logger.warning(
                        f"[NVIDIA Multi-Key Pool] Key #{attempt + 1} ({masked_key}) returned {response.status_code}. Failing over..."
                    )
                    last_error = LLMProviderError(f"NVIDIA NIM error {response.status_code}", status_code=response.status_code, retryable=True)
                    continue

                data = response.json()
                msg = data["choices"][0]["message"]
                content = (msg.get("content") or msg.get("reasoning_content") or "").strip()
                usage = data.get("usage", {})
                prompt_tokens = usage.get("prompt_tokens", 0)
                completion_tokens = usage.get("completion_tokens", 0)
                total_tokens = usage.get("total_tokens", prompt_tokens + completion_tokens)

                return LLMResponse(
                    content=content,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=total_tokens,
                    cost_estimate=0.0,
                    finish_reason=data["choices"][0].get("finish_reason", "stop"),
                )
            except (httpx.TimeoutException, httpx.RequestError) as e:
                logger.warning(f"[NVIDIA Multi-Key Pool] Key #{attempt + 1} ({masked_key}) network issue ({e}). Failing over...")
                last_error = e
                continue

        if last_error:
            logger.error(f"[NVIDIA Multi-Key Pool] All {len(candidate_keys)} keys failed complete: {last_error}")
            raise LLMProviderError(f"All {len(candidate_keys)} NVIDIA NIM keys failed: {str(last_error)}", retryable=True)
