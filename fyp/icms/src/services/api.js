import axios from 'axios'
import { ICMS_AUTH_STORAGE_KEY } from '../constants/storageKeys'

/** Default API URL when .env is missing (Vite must be restarted after changing .env.*). */
const DEFAULT_DEV_API = 'http://127.0.0.1:8000'

const rawBase = import.meta.env.VITE_API_BASE_URL
const baseURL =
  typeof rawBase === 'string' && rawBase.trim() !== ''
    ? rawBase.trim().replace(/\/$/, '')
    : DEFAULT_DEV_API

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120_000,
})

function getStoredToken() {
  try {
    const raw = localStorage.getItem(ICMS_AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.token ?? null
  } catch {
    return null
  }
}

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/** @param {{ email: string, password: string }} body */
export async function login(body) {
  const { data } = await api.post('/auth/login', body)
  return data
}

/**
 * @param {{ email: string, password: string, name?: string, full_name?: string }} body
 */
export async function register(body) {
  const payload = {
    email: body.email,
    password: body.password,
    full_name: (body.full_name ?? body.name ?? '').trim(),
  }
  const { data } = await api.post('/auth/register', payload)
  return data
}

/** @param {{ email: string }} body */
export async function forgotPassword(body) {
  const { data } = await api.post('/auth/forgot-password', body)
  return data
}

export async function fetchProjects() {
  const { data } = await api.get('/projects')
  return data
}

/** @param {{ name: string, description?: string }} body */
export async function createProject(body) {
  const { data } = await api.post('/projects', {
    name: body.name,
    description: body.description ?? '',
  })
  return data
}

/** @param {number | string} projectId */
export async function deleteProject(projectId) {
  await api.delete(`/projects/${encodeURIComponent(String(projectId))}`)
}

/**
 * @param {File} file
 * @param {Record<string, string>} [extraFields]
 */
export async function uploadDataset(file, extraFields = {}) {
  const form = new FormData()
  form.append('file', file)
  Object.entries(extraFields).forEach(([k, v]) => form.append(k, v))
  const { data } = await api.post('/datasets/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/** @param {number | string | null | undefined} [projectId] */
export async function fetchDatasets(projectId) {
  const { data } = await api.get('/datasets', {
    params:
      projectId != null && projectId !== ''
        ? { project_id: Number(projectId) }
        : {},
  })
  return data
}

/** @param {number | string} datasetId */
export async function fetchDataset(datasetId) {
  const { data } = await api.get(`/datasets/${encodeURIComponent(String(datasetId))}`)
  return data
}

/** @param {number | string} datasetId */
export async function deleteDataset(datasetId) {
  await api.delete(`/datasets/${encodeURIComponent(String(datasetId))}`)
}

/**
 * @param {object} body
 * @param {string} body.dataset_id
 * @param {string} body.target_column
 * @param {'classification'|'regression'} body.task_type
 * @param {object} [body.options]
 * @param {string} [body.project_id]
 */
export async function startJob(body) {
  const { data } = await api.post('/jobs/start', body)
  return data
}

/** @param {string} jobId */
export async function fetchJobStatus(jobId) {
  const { data } = await api.get(`/jobs/status/${jobId}`)
  return data
}

/** @param {string} jobId */
export async function deleteJob(jobId) {
  await api.delete(`/jobs/${encodeURIComponent(jobId)}`)
}

/** @param {string} resultId */
export async function fetchResults(resultId) {
  const { data } = await api.get(`/results/${resultId}`)
  return data
}

/**
 * Download an artifact URL returned by /results (absolute or path). Sends JWT like other API calls.
 * @param {string} url
 * @param {string} [fallbackFilename]
 */
export async function downloadArtifactByUrl(url, fallbackFilename = 'download') {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid download URL.')
  }
  let path = url
  try {
    const u = new URL(url, baseURL)
    const origin = new URL(baseURL).origin
    path = u.origin === origin ? u.pathname + u.search : u.href
  } catch {
    path = url.startsWith('/') ? url : `/${url}`
  }
  const response = await api.get(path, {
    responseType: 'blob',
    validateStatus: () => true,
  })
  if (response.status >= 400) {
    let msg = `Download failed (${response.status})`
    try {
      const text = await response.data.text()
      try {
        const j = JSON.parse(text)
        msg = formatDetail(j?.detail) ?? j?.message ?? msg
      } catch {
        if (text?.trim()) msg = text.trim().slice(0, 400)
      }
    } catch {
      /* ignore */
    }
    throw new Error(msg || 'Download failed.')
  }
  const blob = response.data
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error('Empty download response.')
  }
  const cd = response.headers['content-disposition'] || response.headers['Content-Disposition']
  let filename = fallbackFilename
  if (cd && typeof cd === 'string') {
    const m = /filename\*=UTF-8''([^;\n]+)|filename="([^"]+)"|filename=([^;\n]+)/i.exec(cd)
    const raw = m?.[1] || m?.[2] || m?.[3]
    if (raw) {
      try {
        filename = decodeURIComponent(raw.trim().replace(/^["']|["']$/g, ''))
      } catch {
        filename = raw.trim().replace(/^["']|["']$/g, '')
      }
    }
  }
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(href)
}

/** @param {string} projectId */
export async function fetchProject(projectId) {
  const { data } = await api.get(`/projects/${encodeURIComponent(projectId)}`)
  return data
}

/** Recent jobs / runs — optional backend endpoint */
export async function fetchRecentJobs() {
  const { data } = await api.get('/jobs')
  return data
}

function formatDetail(detail) {
  if (detail == null) return null
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (item?.msg) return item.msg
        if (item?.message) return item.message
        return JSON.stringify(item)
      })
      .join(' ')
  }
  if (typeof detail === 'object' && detail.msg) return String(detail.msg)
  return String(detail)
}

export function getErrorMessage(err, fallback = 'Something went wrong.') {
  if (!err) return fallback
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
    return `Cannot reach API at ${baseURL}. Start the backend (uvicorn on port 8000) and check CORS if the app runs on another port.`
  }
  const body = err.response?.data
  const msg =
    formatDetail(body?.detail) ??
    body?.message ??
    body?.error ??
    (typeof body === 'string' ? body : null) ??
    err.message
  return msg || fallback
}

/**
 * Pull JWT from common API response shapes.
 * @param {Record<string, unknown>} data
 */
export function extractAuthFromResponse(data) {
  if (!data || typeof data !== 'object') return { token: null, user: null }
  const token =
    data.access_token ??
    data.token ??
    data.access ??
    data.jwt ??
    data.data?.access_token ??
    data.data?.token ??
    null
  const raw =
    data.user ??
    data.data?.user ??
    (data.email ? { email: data.email, name: data.name, full_name: data.full_name } : null)
  const user =
    raw && typeof raw === 'object'
      ? {
          ...raw,
          name: raw.name ?? raw.full_name ?? '',
          full_name: raw.full_name ?? raw.name ?? '',
        }
      : null
  return { token: token ? String(token) : null, user }
}
