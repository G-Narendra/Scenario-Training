import abc
from dataclasses import dataclass
from typing import AsyncIterator, Optional


@dataclass
class VoiceConfig:
    voice_id: str = "alloy"
    speaking_rate: float = 1.0
    pitch: float = 0.0
    counterpart_name: str = "Counterpart"
    style_prompt: str = ""


@dataclass
class AudioChunk:
    data_b64: str
    sample_rate: int = 24000
    format: str = "pcm16"
    is_final: bool = False


class VoiceProvider(abc.ABC):
    """Abstract Base Class for Real-time Voice Providers."""

    @abc.abstractmethod
    async def initialize_session(self, config: VoiceConfig) -> None:
        """Initialize real-time voice session with persona voice configuration."""
        pass

    @abc.abstractmethod
    async def process_incoming_audio(self, chunk_bytes: bytes) -> Optional[str]:
        """Process incoming microphone audio chunk. Returns partial transcript if available."""
        pass

    @abc.abstractmethod
    async def finalize_trainee_turn(self) -> str:
        """Commit audio and return final transcribed trainee text."""
        pass

    @abc.abstractmethod
    def generate_counterpart_speech(
        self,
        text: str,
        voice_config: VoiceConfig,
    ) -> AsyncIterator[AudioChunk]:
        """Streams synthesized counterpart audio chunks."""
        pass

    @abc.abstractmethod
    async def interrupt(self) -> None:
        """Barge-in signal: immediately cancels outgoing assistant audio within 300ms."""
        pass
