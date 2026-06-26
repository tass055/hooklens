import asyncio
import os
from typing import Any

from faster_whisper import WhisperModel

# Lazy-loaded singleton — loaded once at first transcription request, not at import time
_model: WhisperModel | None = None


class TranscriptionModelError(RuntimeError):
    pass


class AudioTooShortError(RuntimeError):
    pass


class TranscriptionError(RuntimeError):
    pass


def _get_model() -> WhisperModel:
    global _model
    if _model is None:
        model_size = os.getenv("WHISPER_MODEL", "base")
        try:
            # device=cpu, compute_type=int8 — runs on any machine without GPU
            _model = WhisperModel(model_size, device="cpu", compute_type="int8")
        except Exception as exc:
            raise TranscriptionModelError(
                f"Could not load Whisper model '{model_size}'. "
                "Ensure faster-whisper is installed and you have sufficient disk space."
            ) from exc
    return _model


def _transcribe_sync(video_path: str, language: str | None = None) -> dict[str, Any]:
    model = _get_model()
    try:
        segments, info = model.transcribe(
            video_path,
            language=language,
            word_timestamps=True,
            vad_filter=True,
            condition_on_previous_text=False,
            initial_prompt="This is a conversation mixing multiple languages like English, Urdu, and Arabic. Hello, کیا حال ہے؟"
        )
    except Exception as exc:
        raise TranscriptionError(
            "Transcription failed. Please ensure the file is not corrupted and contains clear audio."
        ) from exc

    words = []
    full_text_parts = []

    for segment in segments:
        full_text_parts.append(segment.text.strip())
        if segment.words:
            for word in segment.words:
                words.append({
                    "text": word.word.strip(),
                    "start_ms": int(word.start * 1000),
                    "end_ms": int(word.end * 1000),
                    "confidence": round(word.probability, 3),
                })

    if not words:
        raise AudioTooShortError(
            "No speech detected in this file. "
            "The file may be silent, under 3 seconds, or contain no recognisable speech."
        )

    full_text = " ".join(full_text_parts)
    duration_ms = int(info.duration * 1000) if info.duration else (words[-1]["end_ms"] if words else 0)

    return {
        "full_text": full_text,
        "words": words,
        "duration_ms": duration_ms,
    }


async def transcribe_video(video_path: str, language: str | None = None) -> dict[str, Any]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _transcribe_sync, video_path, language)
