import type { JobStatus } from '../types'

interface Step {
  id: string
  label: string
  activeStatuses: string[]
}

const STEPS: Step[] = [
  { id: 'transcribing', label: 'Transcribing audio', activeStatuses: ['transcribing'] },
  { id: 'correcting', label: 'Correcting transcript', activeStatuses: ['correcting_transcript'] },
  { id: 'identifying', label: 'Identifying hook', activeStatuses: ['identifying_hook'] },
  { id: 'scoring', label: 'Scoring hook content', activeStatuses: ['scoring_hook'] },
  { id: 'generating', label: 'Generating Word report', activeStatuses: ['generating'] },
]

interface Props {
  status: JobStatus | null
  isUploading: boolean
  uploadProgress?: number
}

export default function ProcessingView({ status, isUploading, uploadProgress = 0 }: Props) {
  const progress = isUploading ? Math.max(1, uploadProgress) : (status?.progress ?? 5)
  const mainLabel = isUploading ? `Uploading file…` : (status?.message ?? 'Starting…')

  // Find index of the currently active step
  const currentStatus = status?.status ?? ''
  const activeStepIndex = STEPS.findIndex(step => step.activeStatuses.includes(currentStatus))
  const details = status?.details ?? []

  return (
    <div className="flex flex-col items-center py-16">
      <div className="w-full max-w-md">
        <p className="text-gray-200 font-medium text-center mb-1">{mainLabel}</p>
        
        {!isUploading && status?.message && (
          <p className="text-indigo-400 text-xs text-center mt-1 animate-pulse font-medium">
            Running local AI models on CPU, please wait...
          </p>
        )}

        <div className="mt-4 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-gray-600 text-xs text-right mt-1">{progress}%</p>
      </div>

      {/* Live Log Console */}
      {!isUploading && details.length > 0 && (
        <div className="mt-6 w-full max-w-md bg-gray-900/60 border border-gray-800 rounded-lg p-3 font-mono text-[10px] text-gray-400 max-h-[120px] overflow-y-auto flex flex-col-reverse gap-1 shadow-inner">
          {[...details].reverse().map((line, index) => (
            <div key={index} className="flex gap-1.5 line-clamp-2">
              <span className="text-indigo-500 shrink-0">›</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 flex flex-col gap-3 w-full max-w-md">
        {STEPS.map((step, idx) => {
          let done = false
          let active = false

          if (isUploading) {
            // All steps are pending during upload
            done = false
            active = false
          } else if (status?.status === 'complete') {
            done = true
          } else if (activeStepIndex !== -1) {
            if (idx < activeStepIndex) {
              done = true
            } else if (idx === activeStepIndex) {
              active = true
            }
          }

          return (
            <div
              key={step.id}
              className={[
                'flex items-center gap-3 text-sm transition-colors',
                done   ? 'text-gray-400'  :
                active ? 'text-indigo-300 font-medium' :
                         'text-gray-700',
              ].join(' ')}
            >
              {done ? (
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : active ? (
                <span className="w-4 h-4 flex items-center justify-center shrink-0">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping absolute inline-flex" style={{ width: '8px', height: '8px' }} />
                  <span className="w-2 h-2 rounded-full bg-indigo-400 relative inline-flex" />
                </span>
              ) : (
                <span className="w-4 h-4 flex items-center justify-center shrink-0">
                  <span className="w-2 h-2 rounded-full bg-gray-700" />
                </span>
              )}
              <span>{step.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
