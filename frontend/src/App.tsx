import { useEffect, useRef, useState } from 'react'
import UploadZone from './components/UploadZone'
import ProcessingView from './components/ProcessingView'
import ResultsView from './components/ResultsView'
import { uploadVideo, getStatus, getResult } from './api/client'
import type { AppState, AppError, JobStatus, JobResult } from './types'

const POLL_MS = 2000

// Error messages keyed by error code — specific and actionable (not generic "try again")
function enrichError(err: AppError, model?: string): AppError {
  const enriched: Record<string, AppError> = {
    network_error: {
      code: 'network_error',
      message: 'Cannot reach the HookLens server.',
      action: 'Ensure the backend is running: cd backend && uvicorn main:app --reload --port 8000',
    },
    ollama_unavailable: {
      code: 'ollama_unavailable',
      message: 'Local AI service is offline.',
      action: "Start it with: ollama serve — then try your upload again.",
    },
    ollama_model_missing: {
      code: 'ollama_model_missing',
      message: err.message,
      action: `Install the model: ollama pull ${model ?? 'llama3.2:3b'} — then try again.`,
    },
    audio_too_short: {
      code: 'audio_too_short',
      message: 'No speech detected in this file.',
      action: 'Please upload a video with at least a few seconds of audible speech.',
    },
    transcription_model_error: {
      code: 'transcription_model_error',
      message: 'The transcription model could not load.',
      action: 'Run: pip install faster-whisper — then restart the backend.',
    },
  }
  return enriched[err.code] ?? err
}

export default function App() {
  const [appState, setAppState]   = useState<AppState>('idle')
  const [jobId, setJobId]         = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [result, setResult]       = useState<JobResult | null>(null)
  const [error, setError]         = useState<AppError | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }
  useEffect(() => stopPolling, [])

  const handleFileSelected = async (file: File, language: string | null) => {
    setError(null)
    setAppState('uploading')
    setUploadProgress(0)
    try {
      const { job_id } = await uploadVideo(file, language, (percent) => setUploadProgress(percent))
      setJobId(job_id)
      setAppState('processing')
      startPolling(job_id)
    } catch (e) {
      setError(enrichError(e as AppError))
      setAppState('error')
    }
  }

  const startPolling = (id: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const status = await getStatus(id)
        setJobStatus(status)
        if (status.status === 'complete') {
          stopPolling()
          const data = await getResult(id)
          setResult(data)
          setAppState('complete')
        } else if (status.status === 'error') {
          stopPolling()
          setError(enrichError({
            code: status.error_code ?? 'unknown_error',
            message: status.message,
            action: 'Please try again.',
          }))
          setAppState('error')
        }
      } catch (e) {
        stopPolling()
        setError(enrichError(e as AppError))
        setAppState('error')
      }
    }, POLL_MS)
  }

  const reset = () => {
    stopPolling()
    setAppState('idle')
    setJobId(null)
    setJobStatus(null)
    setResult(null)
    setError(null)
  }


  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col justify-between">
      <div className="flex-1">
        <header className="border-b border-gray-800/60">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="https://asal.life" target="_blank" rel="noopener noreferrer" className="shrink-0">
                <img src="/asal-logo.png" alt="ASAL" className="w-8 h-8 object-contain" />
              </a>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Asal HookLens</h1>
                <p className="text-xs text-gray-600 mt-0.5">Local · Private · Free</p>
              </div>
            </div>
            {appState !== 'idle' && (
              <button
                onClick={reset}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                ← New analysis
              </button>
            )}
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-12">
        {appState === 'idle' && (
          <UploadZone onFileSelected={handleFileSelected} />
        )}

        {(appState === 'uploading' || appState === 'processing') && (
          <ProcessingView status={jobStatus} isUploading={appState === 'uploading'} uploadProgress={uploadProgress} />
        )}

        {appState === 'complete' && result && jobId && (
          <ResultsView result={result} jobId={jobId} />
        )}

        {appState === 'error' && error && (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-red-950/50 border border-red-800/50 flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            <p className="text-red-300 font-medium text-lg mb-2">{error.message}</p>
            <p className="text-gray-500 text-sm mb-2 max-w-md">{error.action}</p>

            {/* Show terminal command inline if it contains a command */}
            {(error.action.includes('ollama') || error.action.includes('uvicorn') || error.action.includes('pip')) && (
              <code className="mt-2 mb-6 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-green-400 font-mono">
                {error.action.match(/:\s*(.+)$/)?.[1] ?? error.action}
              </code>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={reset}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
              >
                {error.code === 'unsupported_format' || error.code === 'file_too_large' || error.code === 'audio_too_short'
                  ? 'Try a different file'
                  : 'Try again'}
              </button>
            </div>
          </div>
        )}
      </main>
      </div>

      <footer className="w-full border-t border-gray-800/40 bg-gray-950/80 backdrop-blur py-8 mt-12 shrink-0">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600 text-center sm:text-left">
            All processing is local — no data leaves your machine
          </p>
          <a
            href="https://asal.life"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 opacity-60 hover:opacity-100 transition-opacity"
          >
            <img src="/asal-logo.png" alt="ASAL" className="w-5 h-5 object-contain" />
            <span className="text-xs text-gray-400">
              Powered by <span className="font-semibold text-gray-300">ASAL</span>
            </span>
          </a>
        </div>
      </footer>
    </div>
  )
}
