import { ref } from 'vue'
import { PUBLIC_API_URL } from 'astro:env/client'

export interface QueuedOp {
  id: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  body?: any
  queuedAt: number
}

const STORAGE_KEY = 'sync_queue'

const pending = ref<QueuedOp[]>([])
const flushing = ref(false)
const lastError = ref<string>('')
const lastSyncedAt = ref(0)

function load() {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) pending.value = parsed
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
}

function persist() {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pending.value))
  } catch {
    /* storage lleno o no disponible */
  }
}

export function enqueueOp(
  method: QueuedOp['method'],
  path: string,
  body?: any
): QueuedOp {
  const op: QueuedOp = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method,
    path,
    body,
    queuedAt: Date.now(),
  }
  pending.value = [...pending.value, op]
  lastError.value = ''
  persist()
  return op
}

export function removeOp(id: string) {
  pending.value = pending.value.filter((op) => op.id !== id)
  persist()
}

export function clearQueue() {
  pending.value = []
  lastError.value = ''
  persist()
}

export function getPendingCount(): number {
  return pending.value.length
}

export function hasPendingOps(): boolean {
  return pending.value.length > 0
}

async function sendOp(op: QueuedOp, token: string | null): Promise<boolean> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${op.path}`, {
    method: op.method,
    headers,
    body: op.body !== undefined ? JSON.stringify(op.body) : undefined,
  })

  if (res.status === 401 || res.status === 403) {
    throw new Error('AUTH_FAILED')
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  return true
}

const API_BASE = PUBLIC_API_URL

export async function flushQueue(getToken: () => string | null): Promise<{
  sent: number
  failed: number
  unauthorized: boolean
}> {
  if (flushing.value) return { sent: 0, failed: 0, unauthorized: false }
  flushing.value = true
  lastError.value = ''

  const ops = [...pending.value]
  let sent = 0
  let failed = 0
  let unauthorized = false

  for (const op of ops) {
    if (unauthorized) {
      failed++
      continue
    }
    try {
      const ok = await sendOp(op, getToken())
      if (ok) {
        removeOp(op.id)
        sent++
      }
    } catch (e: any) {
      if (e.message === 'AUTH_FAILED') {
        unauthorized = true
        failed++
        continue
      }
      failed++
      if (failed === ops.length) {
        lastError.value = 'Sincronización fallida, se reintentará'
      }
      break
    }
  }

  if (sent > 0) {
    lastSyncedAt.value = Date.now()
    window.dispatchEvent(new CustomEvent('sync-flushed'))
  }

  flushing.value = false
  return { sent, failed, unauthorized }
}

export function initSyncQueue(getToken: () => string | null) {
  if (typeof window === 'undefined') return
  load()
  window.addEventListener('online', () => {
    if (hasPendingOps()) flushQueue(getToken)
  })
}

export const syncState = {
  pending,
  flushing,
  lastError,
  lastSyncedAt,
}
