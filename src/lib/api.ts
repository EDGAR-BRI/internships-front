import { enqueueOp } from './syncQueue'
import { resolveApiBase } from './apiUrl'

const API_BASE = resolveApiBase()

interface ApiOptions {
  method?: string
  body?: any
  token?: string
  timeout?: number
  offline?: boolean
}

const ERROR_MESSAGES: Record<string, string> = {
  'Network request failed': 'No se pudo conectar al servidor. Verifica tu conexión a internet.',
  'Failed to fetch': 'No se pudo conectar al servidor. Verifica tu conexión a internet.',
  'NetworkError': 'No se pudo conectar al servidor. Verifica tu conexión a internet.',
  'TimeoutError': 'La solicitud tardó demasiado. Intenta de nuevo.',
  'AbortError': 'La solicitud fue cancelada.',
}

export class OfflineQueuedError extends Error {
  queuedId: string
  constructor(message: string, queuedId: string) {
    super(message)
    this.name = 'OfflineQueuedError'
    this.queuedId = queuedId
  }
}

function isNetworkFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true
  if (error instanceof Error && error.name === 'AbortError') return true
  return false
}

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

function shouldQueue(path: string): boolean {
  if (path.includes('/auth/')) return false
  if (path === '/account/logout') return false
  return true
}

export class ApiError extends Error {
  status?: number
  code?: string
  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function getFriendlyError(error: unknown): string {
  if (error instanceof TypeError) {
    const message = error.message
    for (const [key, friendly] of Object.entries(ERROR_MESSAGES)) {
      if (message.includes(key)) return friendly
    }
    return 'Error de conexión. Intenta de nuevo.'
  }

  if (error instanceof Error) {
    if (error.name === 'TimeoutError' || error.message.includes('timed out')) {
      return 'La solicitud tardó demasiado. Intenta de nuevo.'
    }
    if (error.name === 'AbortError') {
      return 'La solicitud fue cancelada.'
    }
    return error.message
  }

  return 'Ocurrió un error inesperado. Intenta de nuevo.'
}

function unwrapData(data: any): any {
  if (data && typeof data === 'object' && 'data' in data) {
    return data.data
  }
  return data
}

export async function apiFetch<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token, timeout = 10000, offline = false } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (res.status === 204) {
      return undefined as T
    }

    const data = await res.json()

    if (!res.ok) {
      const errorMessage =
        data.message ||
        data.error ||
        (data.errors && data.errors[0]?.message) ||
        'Error en la petición'

      if (res.status === 429 && data.code === 'DAILY_LIMIT') {
        window.dispatchEvent(
          new CustomEvent('daily-limit-reached', {
            detail: { message: errorMessage, resource: data.resource, used: data.used, limit: data.limit },
          })
        )
      }

      throw new ApiError(errorMessage, res.status, data.code)
    }

    return unwrapData(data) as T
  } catch (error) {
    clearTimeout(timeoutId)
    if (
      offline &&
      WRITE_METHODS.includes(method) &&
      isNetworkFailure(error) &&
      shouldQueue(path)
    ) {
      const op = enqueueOp(method as any, path, body)
      throw new OfflineQueuedError(
        'Sin conexión: se guardó localmente y se sincronizará automáticamente',
        op.id
      )
    }
    if (error instanceof ApiError) throw error
    throw new Error(getFriendlyError(error))
  }
}

export const api = {
  get: <T = any>(path: string, token?: string) =>
    apiFetch<T>(path, { token }),

  post: <T = any>(path: string, body: any, token?: string) =>
    apiFetch<T>(path, { method: 'POST', body, token, offline: true }),

  put: <T = any>(path: string, body: any, token?: string) =>
    apiFetch<T>(path, { method: 'PUT', body, token, offline: true }),

  patch: <T = any>(path: string, body: any, token?: string) =>
    apiFetch<T>(path, { method: 'PATCH', body, token, offline: true }),

  delete: <T = any>(path: string, token?: string) =>
    apiFetch<T>(path, { method: 'DELETE', token, offline: true }),
}
