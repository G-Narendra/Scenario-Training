import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncIterator, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class LLMMessage:
    role: str  # "system", "user", "assistant"
    content: str


@dataclass
class LLMResponse:
    content: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost_estimate: float = 0.0
    finish_reason: str = "stop"


class LLMProviderError(Exception):
    """Normalized provider exception for uniform error handling."""

    def __init__(self, message: str, status_code: Optional[int] = None, retryable: bool = False):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.retryable = retryable


class LLMProvider(ABC):
    """Abstract Base Class for LLM providers."""

    @abstractmethod
    def stream_chat(
        self,
        messages: List[LLMMessage],
        system_prompt: str,
        max_tokens: int = 1000,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        """Stream response tokens as an asynchronous generator."""
        pass

    @abstractmethod
    async def complete(
        self,
        messages: List[LLMMessage],
        system_prompt: str,
        max_tokens: int = 1000,
        temperature: float = 0.7,
    ) -> LLMResponse:
        """Return non-streaming complete response with token usage."""
        pass

    async def execute_with_retry(self, func, max_retries: int = 3, initial_delay: float = 0.5):
        """Execute a call with exponential backoff on retryable errors."""
        delay = initial_delay
        for attempt in range(max_retries):
            try:
                return await func()
            except LLMProviderError as e:
                if not e.retryable or attempt == max_retries - 1:
                    raise e
                logger.warning(
                    f"LLM call failed with retryable error (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {delay}s..."
                )
                await asyncio.sleep(delay)
                delay *= 2
            except Exception as e:
                if attempt == max_retries - 1:
                    raise LLMProviderError(f"Unexpected provider error: {str(e)}", retryable=False)
                logger.warning(
                    f"Unexpected error (attempt {attempt + 1}/{max_retries}): {e}. Retrying..."
                )
                await asyncio.sleep(delay)
                delay *= 2
