import hashlib
import io
import logging
from typing import AsyncIterator, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response, StreamingResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice", tags=["Voice TTS"])

# In-memory audio cache for common phrases and immediate re-playback (max 200 items)
_tts_cache: dict[str, bytes] = {}

VOICE_MAP = {
    "female": "en-US-JennyNeural",
    "male": "en-US-GuyNeural",
    "female_alt": "en-US-AriaNeural",
    "male_alt": "en-US-ChristopherNeural",
    "marcus": "en-US-GuyNeural",
    "david": "en-US-ChristopherNeural",
    "elena": "en-US-AriaNeural",
    "sarah": "en-US-JennyNeural",
    "priya": "en-US-AriaNeural",
    "tariq": "en-US-GuyNeural",
    "alex": "en-US-GuyNeural",
    "jenny": "en-US-JennyNeural",
    "guy": "en-US-GuyNeural",
}


@router.api_route("/tts", methods=["GET", "HEAD"])
async def stream_tts(
    text: str = Query(..., min_length=1, max_length=1500, description="Text to synthesize"),
    voice: Optional[str] = Query("female", description="Voice gender or neural voice name"),
):
    """
    Stream high-fidelity neural MP3 speech audio synthesized via Microsoft Edge-TTS.
    Sub-second latency with in-memory caching and conversational delivery.
    """
    clean_text = (
        text.replace("**", "")
        .replace("*", "")
        .replace("#", "")
        .replace("`", "")
        .replace("—", ", ")
        .strip()
    )
    if not clean_text:
        raise HTTPException(status_code=400, detail="Empty text provided.")

    selected_voice = VOICE_MAP.get(voice.lower(), voice if "Neural" in voice else "en-US-JennyNeural")
    cache_key = hashlib.sha256(f"{selected_voice}:{clean_text}".encode("utf-8")).hexdigest()

    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Cache-Control": "public, max-age=86400",
    }

    if cache_key in _tts_cache:
        cached_audio = _tts_cache[cache_key]
        return Response(content=cached_audio, media_type="audio/mpeg", headers=cors_headers)

    try:
        import edge_tts

        # rate=+4% provides natural executive conversational pacing
        communicate = edge_tts.Communicate(clean_text, selected_voice, rate="+4%")
        audio_chunks = []

        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.append(chunk["data"])

        full_audio = b"".join(audio_chunks)
        if len(_tts_cache) < 300:
            _tts_cache[cache_key] = full_audio

        return Response(content=full_audio, media_type="audio/mpeg", headers=cors_headers)
    except Exception as e:
        logger.warning(f"Edge-TTS synthesis error: {e}")
        raise HTTPException(status_code=503, detail="TTS service temporarily unavailable.")
