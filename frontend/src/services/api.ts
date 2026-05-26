const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function getToken(): string | null {
  return localStorage.getItem('token')
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  formData?: FormData,
): Promise<T> {
  const headers: Record<string, string> = {
    ...authHeaders(),
  }
  if (body && !formData) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: formData ?? (body ? JSON.stringify(body) : undefined),
  })

  if (res.status === 204) return undefined as T

  const data = await res.json()

  if (!res.ok) {
    // P0 endpoints return { error: 'string' }; AI module returns { success: false, error: { code, message } }.
    // Normalize both shapes so ApiError.message is always a readable string.
    const rawErr = data?.error
    const errMsg = typeof rawErr === 'string'
      ? rawErr
      : (rawErr?.message ?? `Error ${res.status}`)
    throw new ApiError(errMsg, res.status)
  }

  return data as T
}

export const api = {
  get: <T,>(path: string) => request<T>('GET', path),
  post: <T,>(path: string, body?: unknown) => request<T>('POST', path, body),
  postFormData: <T,>(path: string, formData: FormData) =>
    request<T>('POST', path, undefined, formData),
  put: <T,>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T,>(path: string) => request<T>('DELETE', path),
}

export { ApiError }
