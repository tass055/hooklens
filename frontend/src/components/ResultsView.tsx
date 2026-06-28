import { useState } from 'react'
import HookScoreCard from './HookScoreCard'
import TranscriptView from './TranscriptView'
import DebugView from './DebugView'
import { getDownloadUrl, getSrtDownloadUrl } from '../api/client'
import type { JobResult } from '../types'

interface Props {
  result: JobResult
  jobId: string
}

export default function ResultsView({ result, jobId }: Props) {
  const [isDebugMode, setIsDebugMode] = useState(false)
  const { transcript, hook_identification: hookId, hook_scores: scores, llm_logs: logs } = result

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-100">Analysis Complete</h2>
            <button
              onClick={() => setIsDebugMode(!isDebugMode)}
              className={`p-1.5 rounded-md transition-colors ${isDebugMode ? 'bg-amber-500/20 text-amber-500' : 'bg-gray-800 text-gray-400 hover:text-gray-300'}`}
              title="Toggle Debug Mode"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m0 14v1m-7.071-7.071l-.707.707m15.556-15.556l-.707.707M4 12H3m18 0h-1m-7-7h.01M12 12h.01M16 12h.01M12 16h.01M8 12h.01" />
              </svg>
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Hook identified · Full transcript available below
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href={getSrtDownloadUrl(jobId)}
            download
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors shrink-0 border border-gray-700"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Subtitles (.srt)
          </a>
          <a
            href={getDownloadUrl(jobId)}
            download
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Report (.docx)
          </a>
        </div>
      </div>

      {/* Scores */}
      <HookScoreCard
        valueProp={scores.value_proposition}
        emotionalPull={scores.emotional_pull}
        overallScore={scores.overall_score}
        hookType={hookId.hook_type}
        hookDuration={hookId.hook_duration_estimate}
      />

      {/* Strengths / Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-3">Strengths</h4>
          <ul className="space-y-2">
            {scores.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-300">
                <span className="text-green-500 mt-0.5 shrink-0">+</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-3">Weaknesses</h4>
          <ul className="space-y-2">
            {scores.weaknesses.map((w, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-300">
                <span className="text-amber-500 mt-0.5 shrink-0">−</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Improvement suggestions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-3">Improvement Suggestions</h4>
        <ol className="space-y-2.5">
          {scores.improvement_suggestions.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-300">
              <span className="text-indigo-500 font-semibold shrink-0">{i + 1}.</span>
              {s}
            </li>
          ))}
        </ol>
      </div>

      {/* Rewritten hook */}
      {scores.rewritten_hook_example && (
        <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-xl p-6">
          <h4 className="text-xs font-semibold text-indigo-300 uppercase tracking-wide mb-3">Rewritten Hook Example</h4>
          <p className="text-gray-200 text-sm leading-relaxed italic">
            &ldquo;{scores.rewritten_hook_example}&rdquo;
          </p>
        </div>
      )}

      {/* Alternative Hooks */}
      {scores.alternative_hooks && scores.alternative_hooks.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-4">Alternative Hook Ideas</h4>
          <div className="space-y-3">
            {scores.alternative_hooks.map((h, i) => (
              <div key={i} className="flex items-start gap-3 bg-gray-950/40 border border-gray-800/60 rounded-lg p-3">
                <span className="flex items-center justify-center w-5 h-5 bg-indigo-900/50 text-indigo-300 rounded text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-gray-200 text-sm leading-relaxed">
                  {h}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Teachings & Viral Quotes */}
      {scores.key_teachings && scores.key_teachings.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-4">Key Teachings & Viral Quotes (Direct Excerpts)</h4>
          <div className="space-y-3">
            {scores.key_teachings.map((q, i) => (
              <blockquote key={i} className="pl-4 border-l-2 border-indigo-500 bg-gray-950/30 py-2 px-3 rounded-r-lg">
                <p className="text-gray-300 text-sm leading-relaxed italic">
                  &ldquo;{q}&rdquo;
                </p>
              </blockquote>
            ))}
          </div>
        </div>
      )}

      {/* Full transcript or Debug Mode */}
      {isDebugMode ? (
        <DebugView logs={logs || []} />
      ) : (
        <TranscriptView transcript={transcript} hookId={hookId} />
      )}
    </div>
  )
}
