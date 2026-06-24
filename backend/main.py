import os
import uuid
import logging
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from models import UploadResponse, StatusResponse, ResultResponse
from services.transcription import transcribe_video, TranscriptionModelError, AudioTooShortError, TranscriptionError
from services.hook_analysis import identify_hook, score_hook, correct_transcript, OllamaUnavailableError, OllamaModelMissingError, AnalysisParseError
from services.document import generate_document

load_dotenv()

# Audit logger — event type + job_id only; never logs file content or transcript text (SOC2/GRC)
audit = logging.getLogger("hooklens.audit")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)

ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")]
MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB

# OWASP: validate MIME type, not just file extension
ALLOWED_MIME_TYPES = {
    "video/mp4", "video/quicktime", "video/x-msvideo", "video/webm",
    "video/x-matroska", "video/mpeg", "video/x-ms-wmv",
    "audio/mpeg", "audio/wav", "audio/mp4", "audio/webm", "audio/ogg",
}

UPLOAD_DIR = Path(__file__).parent / "uploads"
OUTPUT_DIR = Path(__file__).parent / "outputs"
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

limiter = Limiter(key_func=get_remote_address)

# API docs disabled — enable only in dev by setting FASTAPI_DOCS=true (SOC2)
_docs = "/docs" if os.getenv("FASTAPI_DOCS") == "true" else None
app = FastAPI(title="HookLens API", version="1.0.0", docs_url=_docs, redoc_url=None)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# In-memory job store — see backend/CLAUDE.md for Redis upgrade path
jobs: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# Health (used by Docker Compose healthcheck)
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

@app.post("/api/upload", response_model=UploadResponse)
@limiter.limit("10/minute")
async def upload_video(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    # OWASP: MIME type allowlist
    if file.content_type not in ALLOWED_MIME_TYPES:
        ext = (file.filename or "").rsplit(".", 1)[-1].upper() if file.filename else "Unknown"
        raise HTTPException(
            status_code=415,
            detail={
                "code": "unsupported_format",
                "message": f"'{ext}' files are not supported.",
                "action": "Please upload MP4, MOV, AVI, WebM, MKV, MP3, or WAV.",
            },
        )

    # OWASP: size guard — read with a +1 byte check to detect oversize without reading the whole thing
    content = await file.read(MAX_FILE_SIZE_BYTES + 1)
    if len(content) > MAX_FILE_SIZE_BYTES:
        size_mb = round(len(content) / (1024 * 1024))
        raise HTTPException(
            status_code=413,
            detail={
                "code": "file_too_large",
                "message": f"Your file is approximately {size_mb}MB. The limit is 500MB.",
                "action": "Please compress or trim the video before uploading.",
            },
        )

    job_id = str(uuid.uuid4())
    # OWASP: UUID-only filename — original name never used in disk path
    video_path = UPLOAD_DIR / f"{job_id}.tmp"
    video_path.write_bytes(content)

    # Store sanitized original name for display only (never in file paths)
    safe_display_name = Path(file.filename or "video").name[:120] if file.filename else "video"

    jobs[job_id] = {
        "status": "queued",
        "progress": 5,
        "message": "Video received, starting transcription…",
        "display_name": safe_display_name,
        "details": ["Job initialized and queued for processing."],
    }

    audit.info("UPLOAD job=%s", job_id)
    background_tasks.add_task(_process_video, job_id, str(video_path))
    return UploadResponse(job_id=job_id)


# ---------------------------------------------------------------------------
# Background job
# ---------------------------------------------------------------------------

async def _process_video(job_id: str, video_path: str) -> None:
    try:
        # --- Step 1: Transcribe ---
        _set(job_id, "transcribing", 15, "Transcribing audio…")
        _log_detail(job_id, "Running Whisper model on CPU. Splitting audio segments...")
        transcript = await transcribe_video(video_path)
        _log_detail(job_id, f"Transcription completed. Extracted {len(transcript['words'])} words.")

        # SOC2: delete video immediately after transcription
        _safe_delete(video_path, job_id)

        # --- Step 1.5: Correct transcript ---
        _set(job_id, "correcting_transcript", 30, "Correcting transcript grammar and readability…")
        _log_detail(job_id, "Sending transcript to local Ollama (Llama 3) for grammar spelling adjustments...")
        
        # Buffer and append raw stream output
        def make_chunk_cb(step_name: str):
            buf = ""
            def cb(chunk: str):
                nonlocal buf
                buf += chunk
                # Limit the stream output log lines to avoid flooding the details list too much
                # Just append short snippets or line splits
                if "\n" in chunk or len(buf) > 80:
                    _log_detail(job_id, f"[{step_name}] {buf.strip()[:100]}...")
                    buf = ""
            return cb

        corrected_text = await correct_transcript(transcript["full_text"], on_chunk=make_chunk_cb("correction"))
        transcript["full_text"] = corrected_text
        _log_detail(job_id, "Transcript corrected. Ready for hook analysis.")

        # --- Step 2: Identify hook ---
        _set(job_id, "identifying_hook", 45, "Scanning transcript to identify hook segment…")
        _log_detail(job_id, "Evaluating transcript structure with Ollama to detect the core hook...")
        hook_id = await identify_hook(transcript, on_chunk=make_chunk_cb("identify"))
        _log_detail(job_id, f"Hook detected! Type: '{hook_id.get('hook_type', 'Unknown')}'. Rationale: {hook_id.get('rationale', '')}")

        # --- Step 3: Score hook ---
        _set(job_id, "scoring_hook", 65, "Scoring hook on value proposition and emotional pull…")
        _log_detail(job_id, "Scoring hook dimensions (emotional pull, strengths, alternative hooks)...")
        hook_scores = await score_hook(transcript, hook_id, on_chunk=make_chunk_cb("scorer"))
        _log_detail(job_id, f"Hook scored successfully. Found {len(hook_scores.get('alternative_hooks', []))} alternative hooks.")

        # --- Step 4: Generate document ---
        _set(job_id, "generating", 85, "Generating Word report…")
        _log_detail(job_id, "Building document layout (.docx file)...")
        output_path = OUTPUT_DIR / f"{job_id}.docx"
        display_name = jobs[job_id].get("display_name", "video")
        await generate_document(transcript, hook_id, hook_scores, str(output_path), display_name)
        _log_detail(job_id, "Document built and finalized on disk.")

        jobs[job_id].update({
            "status": "complete",
            "progress": 100,
            "message": "Analysis complete — your report is ready.",
            "output_path": str(output_path),
            "transcript": transcript,
            "hook_identification": hook_id,
            "hook_scores": hook_scores,
        })
        _log_detail(job_id, "Workflow finished successfully.")
        audit.info("COMPLETE job=%s", job_id)

    except TranscriptionModelError as e:
        _log_detail(job_id, f"Transcription error: {e}")
        _error(job_id, "transcription_model_error", str(e), video_path)
    except AudioTooShortError as e:
        _log_detail(job_id, f"Audio check failure: {e}")
        _error(job_id, "audio_too_short", str(e), video_path)
    except TranscriptionError as e:
        _log_detail(job_id, f"Transcription failed: {e}")
        _error(job_id, "transcription_failed", str(e), video_path)
    except OllamaUnavailableError as e:
        _log_detail(job_id, f"Ollama connection error: {e}")
        _error(job_id, "ollama_unavailable", str(e))
    except OllamaModelMissingError as e:
        _log_detail(job_id, f"Ollama model error: {e}")
        _error(job_id, "ollama_model_missing", str(e))
    except AnalysisParseError as e:
        _log_detail(job_id, f"LLM output parsing error: {e}")
        _error(job_id, "analysis_parse_error", str(e))
    except Exception as e:
        _log_detail(job_id, f"Unexpected workflow crash: {e}")
        audit.exception("UNEXPECTED_ERROR job=%s", job_id)
        _error(job_id, "unknown_error", "An unexpected error occurred. Please try again.")
        _safe_delete(video_path, job_id)


def _set(job_id: str, status: str, progress: int, message: str) -> None:
    jobs[job_id].update({"status": status, "progress": progress, "message": message})


def _log_detail(job_id: str, log_line: str) -> None:
    if "details" not in jobs[job_id]:
        jobs[job_id]["details"] = []
    jobs[job_id]["details"].append(log_line)


def _error(job_id: str, code: str, message: str, video_path: str | None = None) -> None:
    audit.error("ERROR job=%s code=%s", job_id, code)
    jobs[job_id].update({"status": "error", "progress": 0, "message": message, "error_code": code})
    if video_path:
        _safe_delete(video_path, job_id)


def _safe_delete(path: str, job_id: str) -> None:
    try:
        Path(path).unlink(missing_ok=True)
        audit.info("CLEANUP job=%s", job_id)
    except OSError:
        pass


# ---------------------------------------------------------------------------
# Status / Result / Download
# ---------------------------------------------------------------------------

@app.get("/api/status/{job_id}", response_model=StatusResponse)
async def get_status(job_id: str):
    job = _get_job(job_id)
    return StatusResponse(
        status=job["status"],
        progress=job["progress"],
        message=job["message"],
        error_code=job.get("error_code"),
        details=job.get("details", []),
    )


@app.get("/api/result/{job_id}", response_model=ResultResponse)
async def get_result(job_id: str):
    job = _get_job(job_id)
    if job["status"] != "complete":
        raise HTTPException(status_code=400, detail={
            "code": "job_not_complete",
            "message": f"Job is still in '{job['status']}' state.",
            "action": "Poll /api/status until status is 'complete'.",
        })
    return ResultResponse(
        transcript=job["transcript"],
        hook_identification=job["hook_identification"],
        hook_scores=job["hook_scores"],
    )


@app.get("/api/download/{job_id}")
async def download_document(job_id: str):
    job = _get_job(job_id)
    if job["status"] != "complete":
        raise HTTPException(status_code=400, detail={
            "code": "job_not_complete",
            "message": "Report is not ready yet.",
            "action": "Wait for the job to complete before downloading.",
        })
    output_path = job.get("output_path", "")
    if not Path(output_path).exists():
        raise HTTPException(status_code=404, detail={
            "code": "report_not_found",
            "message": "The report file could not be found.",
            "action": "The server may have been restarted. Please re-upload the video.",
        })
    audit.info("DOWNLOAD job=%s", job_id)
    safe_filename = f"hooklens_{job_id[:8]}.docx"
    return FileResponse(
        output_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=safe_filename,
    )


def _get_job(job_id: str) -> dict:
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail={
            "code": "job_not_found",
            "message": "No analysis job found with that ID.",
            "action": "Upload a new video to start an analysis.",
        })
    return jobs[job_id]
