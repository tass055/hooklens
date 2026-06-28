from pydantic import BaseModel
from typing import Optional


class UploadResponse(BaseModel):
    job_id: str


class StatusResponse(BaseModel):
    status: str
    progress: int
    message: str
    error_code: Optional[str] = None
    details: list[str] = []


class TranscriptWord(BaseModel):
    text: str
    start_ms: int
    end_ms: int
    confidence: float


class TranscriptData(BaseModel):
    full_text: str
    original_text: Optional[str] = None
    words: list[TranscriptWord]
    duration_ms: int


class HookIdentification(BaseModel):
    hook_text: str
    hook_start_char: int
    hook_end_char: int
    hook_type: str
    hook_duration_estimate: str
    rationale: str


class ScoreDimension(BaseModel):
    score: int
    explanation: str


class HookScores(BaseModel):
    value_proposition: ScoreDimension
    emotional_pull: ScoreDimension
    overall_score: int
    strengths: list[str]
    weaknesses: list[str]
    improvement_suggestions: list[str]
    rewritten_hook_example: str
    alternative_hooks: list[str]
    key_teachings: list[str]


class LlmDebugLog(BaseModel):
    step: str
    prompt: str
    raw_response: str


class ResultResponse(BaseModel):
    transcript: TranscriptData
    hook_identification: HookIdentification
    hook_scores: HookScores
    llm_logs: list[LlmDebugLog] = []
