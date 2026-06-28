import { useCallback, useRef, useState } from 'react'
import type { AppError } from '../types'

const ACCEPTED_MIME = new Set([
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
  'video/x-matroska', 'video/mpeg', 'video/x-ms-wmv',
  'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/ogg',
])
const MAX_MB = 5000

interface Props {
  onFileSelected: (file: File, language: string | null) => void
  disabled?: boolean
}

function validate(file: File): AppError | null {
  if (!ACCEPTED_MIME.has(file.type)) {
    const ext = file.name.includes('.') ? file.name.split('.').pop()?.toUpperCase() : 'Unknown'
    return {
      code: 'unsupported_format',
      message: `'${ext}' files are not supported.`,
      action: 'Please upload MP4, MOV, AVI, WebM, MKV, MP3, or WAV.',
    }
  }
  const sizeMb = file.size / (1024 * 1024)
  if (sizeMb > MAX_MB) {
    return {
      code: 'file_too_large',
      message: `Your file is ${Math.round(sizeMb)}MB. The limit is ${MAX_MB}MB.`,
      action: 'Please compress or trim the video before uploading.',
    }
  }
  return null
}

export default function UploadZone({ onFileSelected, disabled }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<AppError | null>(null)
  const [language, setLanguage] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handle = useCallback((file: File) => {
    const err = validate(file)
    if (err) { setError(err); return }
    setError(null)
    onFileSelected(file, language || null)
  }, [onFileSelected, language])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) handle(file)
  }, [handle, disabled])

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handle(file)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col items-center">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold tracking-tight mb-3">Analyze your video hook</h2>
        <p className="text-gray-400 text-base max-w-lg">
          Upload a video or audio file. The hook is identified from the full transcript, then scored on value proposition and emotional pull. Runs entirely on your machine.
        </p>
      </div>

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload video file"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={[
          'w-full max-w-2xl border-2 border-dashed rounded-xl p-16 flex flex-col items-center transition-colors',
          disabled
            ? 'border-gray-800 cursor-not-allowed opacity-50'
            : isDragging
              ? 'border-indigo-400 bg-indigo-950/30 cursor-pointer'
              : 'border-gray-700 hover:border-gray-500 bg-gray-900/50 cursor-pointer',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*,audio/*"
          className="hidden"
          onChange={onInput}
          disabled={disabled}
        />

        <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>

        <p className="text-gray-300 font-medium mb-1">Drop your file here, or click to browse</p>
        <p className="text-gray-500 text-sm">MP4, MOV, AVI, WebM, MKV, MP3, WAV · max 5GB</p>
      </div>

      {error && (
        <div className="mt-4 w-full max-w-2xl bg-red-950/40 border border-red-800/60 rounded-lg px-4 py-3">
          <p className="text-red-300 text-sm font-medium">{error.message}</p>
          <p className="text-red-400/70 text-xs mt-0.5">{error.action}</p>
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-2">
        <label htmlFor="language-select" className="text-sm font-medium text-gray-300">
          Video Language (Optional)
        </label>
        <select
          id="language-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={disabled}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-64 p-2.5 transition-colors"
        >
          <option value="">Auto-detect (Recommended)</option>
          <option value="en">English</option>
          <option value="ur">Urdu (اردو)</option>
          <option value="hi">Hindi (हिंदी)</option>
          <option value="ar">Arabic (العربية)</option>
          <option value="es">Spanish (Español)</option>
          <option value="fr">French (Français)</option>
          <option value="de">German (Deutsch)</option>
        </select>
        <p className="text-xs text-gray-500 max-w-xs text-center mt-1">
          Select a language to force the transcription script and prevent hallucinations in mixed-language videos.
        </p>
      </div>

      <p className="mt-8 text-xs text-gray-600">
        All processing happens locally — no data leaves your machine.
      </p>
    </div>
  )
}
