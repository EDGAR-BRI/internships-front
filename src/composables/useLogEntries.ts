import { ref } from 'vue'
import { api } from '../lib/api'
import { useAuth } from './useAuth'

export interface LogEntry {
  id: number
  userId: number
  name: string
  status: 'pending' | 'in_progress' | 'done'
  theory: string | null
  attitudes: string | null
  resources: string | null
  datStart: string
  datEnd: string | null
  createdAt: string
  updatedAt: string
}

export interface LogEntryFormData {
  name: string
  status: 'pending' | 'in_progress' | 'done'
  theory: string | null
  attitudes: string | null
  resources: string | null
  datStart: string
  datEnd: string | null
}

const logEntries = ref<LogEntry[]>([])
const loading = ref(false)
const error = ref('')

function normalizeDate(date: string | null): string | null {
  if (!date) return null
  if (date.includes('T')) {
    const d = new Date(date + ':00')
    if (!isNaN(d.getTime())) return d.toISOString()
    return date + ':00.000Z'
  }
  return `${date}T00:00:00.000Z`
}

export function useLogEntries() {
  const { token } = useAuth()

  async function fetchLogEntries() {
    loading.value = true
    error.value = ''
    try {
      const data = await api.get<{ logEntries: LogEntry[] }>('/log-entries', token.value || undefined)
      logEntries.value = data.logEntries
    } catch (e: any) {
      error.value = e.message || 'Error al cargar actividades'
    } finally {
      loading.value = false
    }
  }

  async function createLogEntry(formData: LogEntryFormData) {
    error.value = ''
    try {
      const payload = {
        ...formData,
        datStart: normalizeDate(formData.datStart),
        datEnd: normalizeDate(formData.datEnd),
      }
      const data = await api.post<{ logEntry: LogEntry }>('/log-entries', payload, token.value || undefined)
      logEntries.value.unshift(data.logEntry)
      return data.logEntry
    } catch (e: any) {
      error.value = e.message || 'Error al crear actividad'
      throw e
    }
  }

  async function updateLogEntry(id: number, formData: Partial<LogEntryFormData>) {
    error.value = ''
    try {
      const payload = {
        ...formData,
        datStart: formData.datStart !== undefined ? normalizeDate(formData.datStart) : undefined,
        datEnd: formData.datEnd !== undefined ? normalizeDate(formData.datEnd) : undefined,
      }
      const data = await api.put<{ logEntry: LogEntry }>(`/log-entries/${id}`, payload, token.value || undefined)
      const index = logEntries.value.findIndex((t) => t.id === id)
      if (index !== -1) {
        logEntries.value[index] = data.logEntry
      }
      return data.logEntry
    } catch (e: any) {
      error.value = e.message || 'Error al actualizar actividad'
      throw e
    }
  }

  async function deleteLogEntry(id: number) {
    error.value = ''
    try {
      await api.delete(`/log-entries/${id}`, token.value || undefined)
      logEntries.value = logEntries.value.filter((t) => t.id !== id)
    } catch (e: any) {
      error.value = e.message || 'Error al eliminar actividad'
      throw e
    }
  }

  return {
    logEntries,
    loading,
    error,
    fetchLogEntries,
    createLogEntry,
    updateLogEntry,
    deleteLogEntry,
  }
}
