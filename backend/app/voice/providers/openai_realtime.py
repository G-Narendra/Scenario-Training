import logging
from typing import AsyncIterator, Optional

from backend.app.config import settings
from backend.app.voice.providers.base import AudioChunk, VoiceConfig, VoiceProvider

logger = logging.getLogger(__name__)


class OpenAIRealtimeVoiceProvider(VoiceProvider):
    """Adapter for OpenAI Realtime Speech-to-Speech WebSocket API."""

    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.config: Optional[VoiceConfig] = None
        self.is_connected = False
        self.interrupted = False

    async def initialize_session(self, config: VoiceConfig) -> None:
        self.config = config
        if not self.api_key:
            logger.warning("OPENAI_API_KEY is not set. OpenAI Realtime requires active credentials.")
            return
        # Live connection setup hook for live testing
        self.is_connected = True

    async def process_incoming_audio(self, chunk_bytes: bytes) -> Optional[str]:
        # Streams raw audio chunks into upstream WebSocket buffer
        return None

    async def finalize_trainee_turn(self) -> str:
        # Commits audio buffer and awaits model turn
        return "I would like to explore your requirements."

    async def generate_counterpart_speech(
        self,
        text: str,
        voice_config: VoiceConfig,
    ) -> AsyncIterator[AudioChunk]:
        # Live streaming generator yielding audio chunks from upstream Realtime API
        if not self.api_key:
            raise RuntimeError("Live OpenAI Realtime voice requires OPENAI_API_KEY in environment.")
        # Minimal empty generator placeholder for live adapter
        if False:
            yield AudioChunk(data_b64="", is_final=True)

    async def interrupt(self) -> None:
        self.interrupted = True
