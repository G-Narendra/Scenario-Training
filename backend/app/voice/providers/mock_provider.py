import asyncio
import base64
import time
from typing import AsyncIterator, Optional

from backend.app.voice.providers.base import AudioChunk, VoiceConfig, VoiceProvider


class MockVoiceProvider(VoiceProvider):
    """Deterministic Mock Voice Provider for fast automated testing and CI."""

    def __init__(self):
        self.config: Optional[VoiceConfig] = None
        self.accumulated_audio_bytes = 0
        self.interrupted = False
        self.last_speech_end_time: Optional[float] = None
        self.first_audio_byte_time: Optional[float] = None

    async def initialize_session(self, config: VoiceConfig) -> None:
        self.config = config
        self.accumulated_audio_bytes = 0
        self.interrupted = False

    async def process_incoming_audio(self, chunk_bytes: bytes) -> Optional[str]:
        self.accumulated_audio_bytes += len(chunk_bytes)
        # Return mock partial transcript if meaningful audio accumulated
        if self.accumulated_audio_bytes > 500:
            return "Could you share what your top priorities are..."
        return None

    async def finalize_trainee_turn(self) -> str:
        self.last_speech_end_time = time.perf_counter()
        self.interrupted = False
        # Return complete transcript of what trainee said
        return "Could you share what your top priorities are for this quarter?"

    async def generate_counterpart_speech(
        self,
        text: str,
        voice_config: VoiceConfig,
    ) -> AsyncIterator[AudioChunk]:
        """Stream simulated audio chunks (base64 PCM16) with barge-in support."""
        self.interrupted = False
        # Mark first audio byte time for latency instrumentation
        start_time = time.perf_counter()
        if self.last_speech_end_time is not None:
            self.last_measured_latency_ms = (start_time - self.last_speech_end_time) * 1000.0
        else:
            self.last_measured_latency_ms = 45.0  # mock nominal latency

        # Generate 4 chunks of simulated audio
        dummy_pcm = b"\x00\x00" * 320  # 320 samples of silence = 20ms at 16kHz
        dummy_b64 = base64.b64encode(dummy_pcm).decode("utf-8")

        for idx in range(4):
            if self.interrupted:
                # Interrupted within ~20ms: halt playback immediately!
                break

            await asyncio.sleep(0.02)  # 20ms simulated streaming interval
            yield AudioChunk(
                data_b64=dummy_b64,
                sample_rate=24000,
                format="pcm16",
                is_final=(idx == 3),
            )

    async def interrupt(self) -> None:
        """Immediately trigger barge-in cancellation."""
        self.interrupted = True
