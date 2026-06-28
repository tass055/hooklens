import type { LlmDebugLog } from '../types'

interface Props {
  logs: LlmDebugLog[]
}

export default function DebugView({ logs }: Props) {
  if (!logs || logs.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-500">
        No debug logs available for this job.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-6 mb-6">
        <h3 className="text-amber-500 font-bold mb-2">Debug Mode Active</h3>
        <p className="text-amber-200/80 text-sm">
          You are viewing the raw API interactions with the local LLM. This includes the exact system prompts sent and the unparsed responses (including Chain-of-Thought reasoning tags) returned.
        </p>
      </div>

      {logs.map((log, idx) => (
        <div key={idx} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="bg-gray-800/50 border-b border-gray-800 px-4 py-3">
            <h4 className="text-gray-200 font-semibold text-sm">
              Step {idx + 1}: <span className="text-indigo-400">{log.step}</span>
            </h4>
          </div>
          
          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prompt Sent</span>
              </div>
              <div className="bg-gray-950 rounded-lg p-4 h-[400px] overflow-y-auto border border-gray-800/60">
                <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                  {log.prompt}
                </pre>
              </div>
            </div>

            {/* Response */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Raw Response Received</span>
              </div>
              <div className="bg-gray-950 rounded-lg p-4 h-[400px] overflow-y-auto border border-gray-800/60">
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                  {log.raw_response}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
