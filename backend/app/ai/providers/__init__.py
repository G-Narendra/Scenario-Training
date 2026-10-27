from typing import Optional

from backend.app.ai.providers.anthropic_provider import AnthropicProvider
from backend.app.ai.providers.base import LLMMessage, LLMProvider, LLMProviderError, LLMResponse
from backend.app.ai.providers.mock_provider import MockLLMProvider
from backend.app.ai.providers.nvidia_provider import NVIDIAProvider
from backend.app.ai.providers.openai_provider import OpenAIProvider
from backend.app.config import settings


def get_llm_provider(
    provider_name: Optional[str] = None,
    mock_instance: Optional[MockLLMProvider] = None,
) -> LLMProvider:
    """Factory to retrieve configured LLM provider instance."""
    if mock_instance:
        return mock_instance

    name = (provider_name or settings.DEFAULT_LLM_PROVIDER).lower()

    if name in ("nvidia", "nvidia_nim", "nim"):
        keys = getattr(settings, "NVIDIA_API_KEYS", [])
        primary = settings.NVIDIA_API_KEY
        if not keys and not primary:
            raise LLMProviderError("NVIDIA_API_KEY is not configured", retryable=False)
        return NVIDIAProvider(
            api_key=primary,
            api_keys=keys,
            base_url=settings.NVIDIA_BASE_URL,
            model=settings.NVIDIA_MODEL,
        )

    if name == "anthropic":
        if not settings.ANTHROPIC_API_KEY:
            raise LLMProviderError("ANTHROPIC_API_KEY is not configured", retryable=False)
        return AnthropicProvider(api_key=settings.ANTHROPIC_API_KEY)

    if name == "openai":
        if not settings.OPENAI_API_KEY:
            raise LLMProviderError("OPENAI_API_KEY is not configured", retryable=False)
        return OpenAIProvider(api_key=settings.OPENAI_API_KEY)

    if name == "mock":
        return MockLLMProvider()

    # Auto-detect: if NVIDIA key is available, use it instead of mock
    if settings.NVIDIA_API_KEY or getattr(settings, "NVIDIA_API_KEYS", None):
        return NVIDIAProvider(
            api_key=settings.NVIDIA_API_KEY,
            api_keys=getattr(settings, "NVIDIA_API_KEYS", []),
            base_url=settings.NVIDIA_BASE_URL,
            model=settings.NVIDIA_MODEL,
        )

    # Fallback to mock
    return MockLLMProvider()


__all__ = [
    "LLMProvider",
    "LLMMessage",
    "LLMResponse",
    "LLMProviderError",
    "MockLLMProvider",
    "AnthropicProvider",
    "OpenAIProvider",
    "NVIDIAProvider",
    "get_llm_provider",
]
