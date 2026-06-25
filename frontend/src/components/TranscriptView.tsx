import { useState } from 'react'
import type { TranscriptData, HookIdentification } from '../types'

interface Props {
  transcript: TranscriptData
  hookId: HookIdentification
}

export default function TranscriptView({ transcript, hookId }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'corrected' | 'original'>('corrected')
  const { full_text, original_text } = transcript
  const { hook_start_char, hook_end_char, rationale } = hookId

  const before = full_text.slice(0, hook_start_char)
  const hook   = full_text.slice(hook_start_char, hook_end_char)
  const after  = full_text.slice(hook_end_char)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Full Transcript</h4>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {expanded ? 'Collapse ↑' : 'Expand ↓'}
        </button>
      </div>

      {rationale && (
        <p className="text-xs text-gray-500 italic mb-4">
          Hook rationale: {rationale}
        </p>
      )}

      {original_text && (
        <div className="flex border-b border-gray-800 mb-4 gap-2">
          <button
            onClick={() => setActiveTab('corrected')}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-all border-b-2 -mb-[1px] ${
              activeTab === 'corrected'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20'
                : 'border-transparent text-gray-500 hover:text-gray-400'
            }`}
          >
            Corrected (AI Cleaned)
          </button>
          <button
            onClick={() => setActiveTab('original')}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-all border-b-2 -mb-[1px] ${
              activeTab === 'original'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20'
                : 'border-transparent text-gray-500 hover:text-gray-400'
            }`}
          >
            Original (Verbatim)
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 text-xs text-gray-500">
        {activeTab === 'corrected' && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-yellow-400/30 border border-yellow-400/50" />
            Identified hook segment
          </span>
        )}
        <span>{Math.round(transcript.duration_ms / 1000)}s transcript</span>
      </div>

      <div className={[
        'relative text-sm text-gray-400 leading-relaxed font-mono whitespace-pre-wrap break-words',
        expanded ? '' : 'max-h-52 overflow-hidden',
      ].join(' ')}>
        {activeTab === 'corrected' ? (
          <>
            <span>{before}</span>
            {hook && (
              <mark className="bg-yellow-400/20 text-yellow-100 rounded-sm px-0.5 not-italic">
                {hook}
              </mark>
            )}
            <span>{after}</span>
          </>
        ) : (
          <span>{original_text || full_text}</span>
        )}

        {!expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none" />
        )}
      </div>

      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Show full transcript ↓
        </button>
      )}
    </div>
  )
}
