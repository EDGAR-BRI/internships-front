import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api, OfflineQueuedError } from '../lib/api'
import { useAuthStore } from './useAuth'
import { registerReset, canPersist, persistStorage } from './registry'
import { isFresh } from './ttl'

export interface LogEntry {
  id: number
  userId: number
  name: string
  status: 'pending' | 'in_progress' | 'done'
  week: number | null
  area: string | null
  theory: string | null
  impact: string | null
  resources: string | null
  datStart: string
  datEnd: string | null
  createdAt: string
  updatedAt: string
}

export interface LogEntryFormData {
  name: string
  status: 'pending' | 'in_progress' | 'done'
  week: number | null
  area: string | null
  theory: string | null
  impact: string | null
  resources: string | null
  datStart: string
  datEnd: string | null
}

function normalizeDate(date: string | null): string | null {
  if (!date) return null
  if (date.includes('T')) {
    const d = new Date(date + ':00')
    if (!isNaN(d.getTime())) return d.toISOString()
    return date + ':00.000Z'
  }
  return `${date}T00:00:00.000Z`
}

export const useLogEntriesStore = defineStore(
  'logEntries',
  () => {
    const logEntries = ref<LogEntry[]>([])
    const loading = ref(false)
    const error = ref('')
    const lastFetched = ref(0)

    function touch() {
      lastFetched.value = Date.now()
    }

    async function fetchLogEntries() {
      const auth = useAuthStore()
      if (isFresh(lastFetched.value)) return

      const background = logEntries.value.length > 0
      if (!background) loading.value = true
      error.value = ''

      try {
        const data = await api.get<{ logEntries: LogEntry[] }>(
          '/log-entries',
          auth.token || undefined
        )
        logEntries.value = data.logEntries
        touch()
      } catch (e: any) {
        if (!background) error.value = e.message || 'Error al cargar actividades'
      } finally {
        if (!background) loading.value = false
      }
    }

    function localLogEntry(formData: LogEntryFormData): LogEntry {
      const now = new Date().toISOString()
      return {
        id: -Date.now(),
        userId: 0,
        name: formData.name,
        status: formData.status,
        week: formData.week,
        area: formData.area,
        theory: formData.theory,
        impact: formData.impact,
        resources: formData.resources,
        datStart: normalizeDate(formData.datStart) ?? formData.datStart,
        datEnd: normalizeDate(formData.datEnd) ?? formData.datEnd,
        createdAt: now,
        updatedAt: now,
      }
    }

    async function createLogEntry(formData: LogEntryFormData) {
      const auth = useAuthStore()
      error.value = ''
      try {
        const payload = {
          ...formData,
          datStart: normalizeDate(formData.datStart),
          datEnd: normalizeDate(formData.datEnd),
        }
        const data = await api.post<{ logEntry: LogEntry }>(
          '/log-entries',
          payload,
          auth.token || undefined
        )
        logEntries.value.unshift(data.logEntry)
        touch()
        return data.logEntry
      } catch (e: any) {
        if (e instanceof OfflineQueuedError) {
          logEntries.value.unshift(localLogEntry(formData))
          touch()
          throw e
        }
        error.value = e.message || 'Error al crear actividad'
        throw e
      }
    }

    async function updateLogEntry(id: number, formData: Partial<LogEntryFormData>) {
      const auth = useAuthStore()
      error.value = ''
      try {
        const payload = {
          ...formData,
          datStart: formData.datStart !== undefined ? normalizeDate(formData.datStart) : undefined,
          datEnd: formData.datEnd !== undefined ? normalizeDate(formData.datEnd) : undefined,
        }
        const data = await api.put<{ logEntry: LogEntry }>(
          `/log-entries/${id}`,
          payload,
          auth.token || undefined
        )
        const index = logEntries.value.findIndex((t) => t.id === id)
        if (index !== -1) {
          logEntries.value[index] = data.logEntry
        }
        touch()
        return data.logEntry
      } catch (e: any) {
        if (e instanceof OfflineQueuedError) {
          const index = logEntries.value.findIndex((t) => t.id === id)
          if (index !== -1) {
            logEntries.value[index] = { ...logEntries.value[index], ...formData }
          }
          touch()
          throw e
        }
        error.value = e.message || 'Error al actualizar actividad'
        throw e
      }
    }

    async function deleteLogEntry(id: number) {
      const auth = useAuthStore()
      error.value = ''
      try {
        await api.delete(`/log-entries/${id}`, auth.token || undefined)
        logEntries.value = logEntries.value.filter((t) => t.id !== id)
        touch()
      } catch (e: any) {
        if (e instanceof OfflineQueuedError) {
          logEntries.value = logEntries.value.filter((t) => t.id !== id)
          touch()
          throw e
        }
        error.value = e.message || 'Error al eliminar actividad'
        throw e
      }
    }

    function reset() {
      logEntries.value = []
      loading.value = false
      error.value = ''
      lastFetched.value = 0
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('sync-flushed', () => {
        lastFetched.value = 0
        fetchLogEntries()
      })
    }

    registerReset(reset)

    return {
      logEntries,
      loading,
      error,
      lastFetched,
      fetchLogEntries,
      createLogEntry,
      updateLogEntry,
      deleteLogEntry,
      reset,
    }
  },
  {
    persist: canPersist
      ? {
          key: 'logEntries',
          storage: persistStorage!,
          pick: ['logEntries', 'lastFetched'],
        }
      : false,
  }
)
