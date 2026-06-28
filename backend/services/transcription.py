import asyncio
import os
from typing import Any
try:
    import torch
    from pyannote.audio import Pipeline
except ImportError:
    Pipeline = None
    torch = None

from faster_whisper import WhisperModel

# Lazy-loaded singleton — loaded once at first transcription request, not at import time
_model: WhisperModel | None = None
_diarization_pipeline = None

def _get_diarization_pipeline():
    global _diarization_pipeline
    if _diarization_pipeline is None and Pipeline is not None:
        hf_token = os.getenv("HF_TOKEN")
        if hf_token:
            try:
                _diarization_pipeline = Pipeline.from_pretrained(
                    "pyannote/speaker-diarization-3.1",
                    use_auth_token=hf_token
                )
                if torch.cuda.is_available():
                    _diarization_pipeline.to(torch.device("cuda"))
            except Exception as e:
                print(f"Failed to load pyannote diarization: {e}")
    return _diarization_pipeline


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


PROMPTS = {
    "ur": "یہ ایک اردو گفتگو ہے جس میں کچھ انگلش کے الفاظ شامل ہیں۔",
    "hi": "यह एक हिंदी वार्तालाप है जिसमें कुछ अंग्रेजी शब्द हैं।",
    "es": "Esta es una conversación en español con algunas palabras en inglés.",
    "ar": "هذه محادثة باللغة العربية مع بعض الكلمات الإنجليزية.",
    "fr": "Il s'agit d'une conversation en français avec quelques mots en anglais.",
    "de": "Dies ist ein deutsches Gespräch mit einigen englischen Wörtern.",
}

def _transcribe_sync(video_path: str, language: str | None = None, on_progress: Any | None = None) -> dict[str, Any]:
    model = _get_model()
    prompt = PROMPTS.get(language) if language else "This is a conversation mixing multiple languages."
    
    try:
        segments, info = model.transcribe(
            video_path,
            language=language,
            word_timestamps=True,
            vad_filter=True,
            condition_on_previous_text=False,
            initial_prompt=prompt,
            repetition_penalty=1.2
        )
    except Exception as exc:
        raise TranscriptionError(
            "Transcription failed. Please ensure the file is not corrupted and contains clear audio."
        ) from exc

    words = []
    full_text_parts = []

    for segment in segments:
        full_text_parts.append(segment.text.strip())
        if on_progress:
            on_progress(segment.text.strip(), segment.end, info.duration)
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

    # --- Step 2: Speaker Diarization ---
    diarizer = _get_diarization_pipeline()
    if diarizer:
        try:
            diarization = diarizer(video_path)
            for word in words:
                word_mid = (word["start_ms"] + word["end_ms"]) / 2000.0
                for turn, _, speaker in diarization.itertracks(yield_label=True):
                    if turn.start <= word_mid <= turn.end:
                        word["speaker"] = speaker
                        break
        except Exception as e:
            print(f"Diarization failed for this file: {e}")

    if words and any("speaker" in w for w in words[:10]):
        lines = []
        current_speaker = None
        current_line = []
        for word in words:
            spk = word.get("speaker", "Unknown")
            if spk != current_speaker:
                if current_speaker is not None:
                    lines.append(f"[{current_speaker}]\n" + " ".join(current_line) + "\n")
                current_speaker = spk
                current_line = [word["text"]]
            else:
                current_line.append(word["text"])
        if current_line:
            lines.append(f"[{current_speaker}]\n" + " ".join(current_line) + "\n")
        full_text = "\n".join(lines).strip()
    else:
        full_text = " ".join(full_text_parts)

    duration_ms = int(info.duration * 1000) if info.duration else (words[-1]["end_ms"] if words else 0)

    return {
        "full_text": full_text,
        "words": words,
        "duration_ms": duration_ms,
    }


async def transcribe_video(video_path: str, language: str | None = None, on_progress: Any | None = None) -> dict[str, Any]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _transcribe_sync, video_path, language, on_progress)
