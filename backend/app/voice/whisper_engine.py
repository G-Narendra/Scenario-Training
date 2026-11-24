import asyncio
import io
import logging
import os
import tempfile
from typing import Optional

logger = logging.getLogger(__name__)

_whisper_model = None
_model_lock = asyncio.Lock()


def get_whisper_model():
    """Lazy-load the faster-whisper INT8 CPU model as a process-level singleton."""
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            model_size = os.environ.get("WHISPER_MODEL_SIZE", "tiny.en")
            logger.info("Initializing faster-whisper model: %s (CPU INT8)...", model_size)
            _whisper_model = WhisperModel(
                model_size,
                device="cpu",
                compute_type="int8",
                cpu_threads=int(os.environ.get("WHISPER_CPU_THREADS", "4")),
            )
            logger.info("faster-whisper model %s loaded successfully.", model_size)
        except Exception as exc:
            logger.error("Failed to initialize faster-whisper model: %s", exc)
            _whisper_model = None
    return _whisper_model


def _sync_transcribe(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """Synchronous CPU transcription executed in worker thread to prevent event-loop blocking."""
    model = get_whisper_model()
    if model is None:
        logger.warning("faster-whisper model unavailable, returning empty string.")
        return ""

    suffix = os.path.splitext(filename)[1] or ".webm"
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp.flush()
            temp_path = tmp.name

        # vad_filter=False guarantees that short or soft utterances are never dropped by Silero VAD
        segments, _info = model.transcribe(
            temp_path,
            beam_size=1,
            language="en",
            vad_filter=False,
        )
        text = " ".join(seg.text for seg in segments).strip()

        # If text is empty with language="en", retry with auto-detection to catch accents/dialects
        if not text:
            segments, _info = model.transcribe(
                temp_path,
                beam_size=1,
                vad_filter=False,
            )
            text = " ".join(seg.text for seg in segments).strip()

        logger.info("faster-whisper transcribed %d bytes -> '%s'", len(audio_bytes), text)
        return text
    except Exception as exc:
        logger.error("Error during faster-whisper transcription: %s", exc)
        return ""
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


async def transcribe_audio_bytes(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """Asynchronously transcribe raw audio bytes without blocking the FastAPI event loop."""
    if not audio_bytes or len(audio_bytes) < 100:
        return ""

    # Optional Groq cloud acceleration if API key is provided
    groq_api_key = os.environ.get("GROQ_API_KEY")
    if groq_api_key:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                files = {"file": (filename, audio_bytes, "audio/webm")}
                data = {"model": "whisper-large-v3-turbo"}
                headers = {"Authorization": f"Bearer {groq_api_key}"}
                resp = await client.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    files=files,
                    data=data,
                    headers=headers,
                )
                if resp.status_code == 200:
                    groq_text = resp.json().get("text", "").strip()
                    if groq_text:
                        logger.info("Groq whisper transcribed: '%s'", groq_text)
                        return groq_text
        except Exception as groq_err:
            logger.warning("Groq whisper failed (%s), falling back to self-hosted faster-whisper", groq_err)

    # Self-hosted faster-whisper execution
    return await asyncio.to_thread(_sync_transcribe, audio_bytes, filename)
