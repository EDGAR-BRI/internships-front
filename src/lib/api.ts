const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:3333/api/v1'

interface ApiOptions {
  method?: string
  body?: any
  token?: string
  timeout?: number
}

const ERROR_MESSAGES: Record<string, string> = {
  'Network request failed': 'No se pudo conectar al servidor. Verifica tu conexión a internet.',
  'Failed to fetch': 'No se pudo conectar al servidor. Verifica tu conexión a internet.',
  'NetworkError': 'No se pudo conectar al servidor. Verifica tu conexión a internet.',
  'TimeoutError': 'La solicitud tardó demasiado. Intenta de nuevo.',
  'AbortError': 'La solicitud fue cancelada.',
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
  const { method = 'GET', body, token, timeout = 10000 } = options

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
      throw new Error(errorMessage)
    }

    return unwrapData(data) as T
  } catch (error) {
    clearTimeout(timeoutId)
    throw new Error(getFriendlyError(error))
  }
}

export const api = {
  get: <T = any>(path: string, token?: string) =>
    apiFetch<T>(path, { token }),

  post: <T = any>(path: string, body: any, token?: string) =>
    apiFetch<T>(path, { method: 'POST', body, token }),

  put: <T = any>(path: string, body: any, token?: string) =>
    apiFetch<T>(path, { method: 'PUT', body, token }),

  delete: <T = any>(path: string, token?: string) =>
    apiFetch<T>(path, { method: 'DELETE', token }),
}
