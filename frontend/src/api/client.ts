import type { JobStatus, JobResult, AppError } from '../types'

const BASE = import.meta.env.VITE_API_URL ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, init)
  } catch {
    throw {
      code: 'network_error',
      message: 'Cannot reach the HookLens server.',
      action: 'Make sure the backend is running: uvicorn main:app --reload --port 8000',
    } satisfies AppError
  }

  if (!res.ok) {
    let detail: { code?: string; message?: string; action?: string } = {}
    try {
      const body = await res.json()
      detail = body.detail ?? body
    } catch { /* non-JSON error body */ }

    throw {
      code: detail.code ?? `http_${res.status}`,
      message: detail.message ?? `Request failed (${res.status}).`,
      action: detail.action ?? 'Please try again.',
    } satisfies AppError
  }

  return res.json() as Promise<T>
}

export function uploadVideo(file: File, language: string | null, onProgress?: (percent: number) => void): Promise<{ job_id: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress(percent)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          resolve(response)
        } catch (e) {
          reject({
            code: 'parse_error',
            message: 'Failed to parse server response.',
            action: 'Please try again.'
          } satisfies AppError)
        }
      } else {
        let detail: any = {}
        try {
          const body = JSON.parse(xhr.responseText)
          detail = body.detail ?? body
        } catch {}

        reject({
          code: detail.code ?? `http_${xhr.status}`,
          message: detail.message ?? `Request failed (${xhr.status}).`,
          action: detail.action ?? 'Please try again.',
        } satisfies AppError)
      }
    }

    xhr.onerror = () => {
      reject({
        code: 'network_error',
        message: 'Cannot reach the HookLens server.',
        action: 'Make sure the backend is running: uvicorn main:app --reload --port 8000',
      } satisfies AppError)
    }

    xhr.open('POST', `${BASE}/api/upload`)
    const form = new FormData()
    form.append('file', file)
    if (language) {
      form.append('language', language)
    }
    xhr.send(form)
  })
}

export async function getStatus(jobId: string): Promise<JobStatus> {
  return request<JobStatus>(`/api/status/${jobId}`)
}

export async function getResult(jobId: string): Promise<JobResult> {
  return request<JobResult>(`/api/result/${jobId}`)
}

export function getDownloadUrl(jobId: string): string {
  return `${BASE}/api/download/${jobId}`
}

export function getSrtDownloadUrl(jobId: string): string {
  return `${BASE}/api/download/srt/${jobId}`
}
