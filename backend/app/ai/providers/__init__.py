from typing import Optional

from backend.app.ai.providers.anthropic_provider import AnthropicProvider
from backend.app.ai.providers.base import LLMMessage, LLMProvider, LLMProviderError, LLMResponse
from backend.app.ai.providers.mock_provider import MockLLMProvider
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

    if name == "anthropic":
        if not settings.ANTHROPIC_API_KEY:
            raise LLMProviderError("ANTHROPIC_API_KEY is not configured", retryable=False)
        return AnthropicProvider(api_key=settings.ANTHROPIC_API_KEY)

    if name == "openai":
        if not settings.OPENAI_API_KEY:
            raise LLMProviderError("OPENAI_API_KEY is not configured", retryable=False)
        return OpenAIProvider(api_key=settings.OPENAI_API_KEY)

    # Default to mock
    return MockLLMProvider()


__all__ = [
    "LLMProvider",
    "LLMMessage",
    "LLMResponse",
    "LLMProviderError",
    "MockLLMProvider",
    "AnthropicProvider",
    "OpenAIProvider",
    "get_llm_provider",
]
