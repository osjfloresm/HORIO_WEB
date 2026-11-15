const API = import.meta.env.VITE_API_URL || '/api/v1'
const KEY = 'horion.session'
export const session = {
  get: () => {
    try {
      return JSON.parse(sessionStorage.getItem(KEY) || 'null')
    } catch {
      return null
    }
  },
  set: (value) => {
    if (value) sessionStorage.setItem(KEY, JSON.stringify(value))
    else sessionStorage.removeItem(KEY)
  },
}
export class ApiError extends Error {
  constructor(message, fields = {}, status = 0) {
    super(message)
    this.fields = fields
    this.status = status
  }
}
let refreshing
async function refreshSession() {
  if (!refreshing)
    refreshing = (async () => {
      const current = session.get()
      if (!current?.refresh) return false
      const response = await fetch(`${API}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: current.refresh }),
      })
      if (!response.ok) {
        session.set(null)
        window.dispatchEvent(new Event('horion:logout'))
        return false
      }
      session.set({ ...current, ...(await response.json()) })
      return true
    })().finally(() => {
      refreshing = undefined
    })
  return refreshing
}
export async function api(path, { method = 'GET', body, signal, blob = false, retry = true } = {}) {
  const headers = {}
  const token = session.get()?.access
  if (token) headers.Authorization = `Bearer ${token}`
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json'
  let response
  try {
    response = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError(
      'No se pudo conectar con Horion. Comprueba que Django esté iniciado e inténtalo de nuevo.',
    )
  }
  if (
    response.status === 401 &&
    token &&
    retry &&
    !['/auth/login/', '/auth/register/', '/auth/refresh/'].includes(path)
  ) {
    if (await refreshSession()) return api(path, { method, body, signal, blob, retry: false })
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const message =
      typeof data === 'string'
        ? data
        : Array.isArray(data)
          ? data.join(' ')
          : data.detail ||
            data.non_field_errors?.join(' ') ||
            'Revisa los campos indicados e inténtalo de nuevo.'
    throw new ApiError(message, data, response.status)
  }
  return response.status === 204 ? null : blob ? response.blob() : response.json()
}
export async function download(path, filename) {
  const blob = await api(path, { blob: true })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
