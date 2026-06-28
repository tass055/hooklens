export interface TranscriptWord {
  text: string
  start_ms: number
  end_ms: number
  confidence: number
  speaker?: string
}

export interface TranscriptData {
  full_text: string
  original_text?: string
  words: TranscriptWord[]
  duration_ms: number
}

export interface HookIdentification {
  hook_text: string
  hook_start_char: number
  hook_end_char: number
  hook_type: string
  hook_duration_estimate: string
  rationale: string
}

export interface ScoreDimension {
  score: number
  explanation: string
}

export interface HookScores {
  value_proposition: ScoreDimension
  emotional_pull: ScoreDimension
  overall_score: number
  strengths: string[]
  weaknesses: string[]
  improvement_suggestions: string[]
  rewritten_hook_example: string
  alternative_hooks?: string[]
  key_teachings?: string[]
}

export interface LlmDebugLog {
  step: string
  prompt: string
  raw_response: string
}

export interface JobResult {
  transcript: TranscriptData
  hook_identification: HookIdentification
  hook_scores: HookScores
  llm_logs?: LlmDebugLog[]
}

export interface JobStatus {
  status:
    | 'queued'
    | 'transcribing'
    | 'identifying_hook'
    | 'scoring_hook'
    | 'generating'
    | 'complete'
    | 'error'
  progress: number
  message: string
  error_code?: string
  details?: string[]
}

export interface AppError {
  code: string
  message: string
  action: string
}

export type AppState = 'idle' | 'uploading' | 'processing' | 'complete' | 'error'
