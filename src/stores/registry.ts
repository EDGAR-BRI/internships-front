type ResetFn = () => void

const resets = new Set<ResetFn>()

export const DATA_STORE_PERSIST_KEYS = [
  'logEntries',
  'notes',
  'attendances',
  'subscription',
  'settings',
  'admin',
] as const

export function registerReset(fn: ResetFn) {
  resets.add(fn)
}

export const persistStorage =
  typeof window !== 'undefined' && typeof sessionStorage !== 'undefined' ? sessionStorage : null

export const canPersist = persistStorage !== null

export function clearPersistedData() {
  if (typeof sessionStorage === 'undefined') return
  for (const key of DATA_STORE_PERSIST_KEYS) {
    sessionStorage.removeItem(key)
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('sync_queue')
  }
}

export function resetAllStores() {
  resets.forEach((fn) => fn())
  clearPersistedData()
}
