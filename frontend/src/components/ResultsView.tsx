import HookScoreCard from './HookScoreCard'
import TranscriptView from './TranscriptView'
import { getDownloadUrl } from '../api/client'
import type { JobResult } from '../types'

interface Props {
  result: JobResult
  jobId: string
}

export default function ResultsView({ result, jobId }: Props) {
  const { transcript, hook_identification: hookId, hook_scores: scores } = result

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Analysis Complete</h2>
          <p className="text-gray-500 text-sm mt-1">
            Hook identified · Full transcript available below
          </p>
        </div>
        <a
          href={getDownloadUrl(jobId)}
          download
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Report (.docx)
        </a>
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

      {/* Full transcript */}
      <TranscriptView transcript={transcript} hookId={hookId} />
    </div>
  )
}
