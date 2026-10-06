from backend.app.config import settings
from backend.app.voice.providers.base import VoiceConfig, VoiceProvider
from backend.app.voice.providers.mock_provider import MockVoiceProvider
from backend.app.voice.providers.openai_realtime import OpenAIRealtimeVoiceProvider

__all__ = [
    "VoiceConfig",
    "VoiceProvider",
    "MockVoiceProvider",
    "OpenAIRealtimeVoiceProvider",
    "get_voice_provider",
]


def get_voice_provider() -> VoiceProvider:
    """Returns configured voice provider based on environment settings."""
    if settings.VOICE_PROVIDER == "openai_realtime" and settings.OPENAI_API_KEY:
        return OpenAIRealtimeVoiceProvider()
    return MockVoiceProvider()
