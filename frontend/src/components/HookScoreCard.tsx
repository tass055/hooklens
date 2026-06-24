import type { ScoreDimension } from '../types'

function scoreColor(score: number): string {
  if (score >= 7) return '#22c55e'   // green
  if (score >= 4) return '#f59e0b'   // amber
  return '#ef4444'                   // red
}

interface RingProps {
  score: number
  label: string
  color: string
}

function ScoreRing({ score, label, color }: RingProps) {
  const r = 40
  const circ = 2 * Math.PI * r
  const pct = score / 10
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#1f2937" strokeWidth="10" />
          <circle
            cx="50" cy="50" r={r} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{score}</span>
          <span className="text-xs text-gray-500">/10</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-gray-300 text-center">{label}</p>
    </div>
  )
}

interface Props {
  valueProp: ScoreDimension
  emotionalPull: ScoreDimension
  overallScore: number
  hookType: string
  hookDuration: string
}

export default function HookScoreCard({ valueProp, emotionalPull, overallScore, hookType, hookDuration }: Props) {
  const overallColor = scoreColor(overallScore)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-100">Hook Analysis</h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs bg-indigo-900/60 text-indigo-300 border border-indigo-800/50 px-2 py-0.5 rounded-full">
              {hookType}
            </span>
            <span className="text-xs text-gray-500">{hookDuration}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold" style={{ color: overallColor }}>
            {overallScore}
            <span className="text-lg text-gray-500">/10</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Overall score</p>
        </div>
      </div>

      <div className="flex justify-around mb-8">
        <ScoreRing score={valueProp.score} label="Value Proposition" color="#6366f1" />
        <ScoreRing score={emotionalPull.score} label="Emotional Pull" color="#a78bfa" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
          <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wide mb-2">Value Proposition</p>
          <p className="text-sm text-gray-300 leading-relaxed">{valueProp.explanation}</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
          <p className="text-xs text-purple-400 font-semibold uppercase tracking-wide mb-2">Emotional Pull</p>
          <p className="text-sm text-gray-300 leading-relaxed">{emotionalPull.explanation}</p>
        </div>
      </div>
    </div>
  )
}
