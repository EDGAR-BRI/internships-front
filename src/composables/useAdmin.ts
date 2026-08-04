import { ref } from 'vue'
import { api } from '../lib/api'
import { useAuth } from './useAuth'

export interface AdminUser {
  id: number
  fullName: string | null
  email: string
  role: string
  createdAt: string
  completedDays: number
  completedHours: number
  attendanceCount: number
  notesCount: number
  logEntriesCount: number
  lastActivity: string
}

export interface AdminSummary {
  totalUsers: number
  activeUsers: number
  totalHours: number
  totalNotes: number
  totalLogEntries: number
}

export interface UserSettingsDetail {
  startDate: string | null
  endDate: string | null
  workType: 'full' | 'partial' | null
  workHoursPerDay: number | null
  daysPerWeek: number | null
  skippedWeeks: number[] | null
}

export interface UserProgressDetail {
  fullDayHours: number
  totalDays: number
  totalHours: number
  completedDays: number
  completedHours: number
  remainingDays: number
  remainingHours: number
  onSiteDays: number
  remoteDays: number
  percent: number
}

export interface AttendanceDetail {
  id: number
  date: string
  mode: 'on_site' | 'remote' | null
  isFullDay: boolean | null
  hours: number | null
  checkIn: string | null
  checkOut: string | null
  completedDay: boolean
  dayHours: number
}

export interface NoteDetail {
  id: number
  title: string | null
  content: string
  tag: string
  createdAt: string
}

export interface LogEntryDetail {
  id: number
  name: string
  status: string
  week: number | null
  createdAt: string
}

export interface AdminUserDetail {
  id: number
  fullName: string | null
  email: string
  role: string
  initials: string
  createdAt: string
  settings: UserSettingsDetail | null
  progress: UserProgressDetail
  attendances: AttendanceDetail[]
  notes: NoteDetail[]
  logEntries: LogEntryDetail[]
  logEntriesByStatus: Record<string, number>
}

const users = ref<AdminUser[]>([])
const summary = ref<AdminSummary | null>(null)
const loading = ref(false)
const error = ref('')
const details = ref<Record<number, AdminUserDetail>>({})
const detailLoadingId = ref<number | null>(null)
const actionError = ref('')

export function useAdmin() {
  const { token } = useAuth()

  async function fetchUsers() {
    loading.value = true
    error.value = ''
    try {
      const data = await api.get<AdminUser[]>('/admin/users', token.value || undefined)
      users.value = data
    } catch (e: any) {
      error.value = e.message || 'Error al cargar usuarios'
    } finally {
      loading.value = false
    }
  }

  async function fetchSummary() {
    error.value = ''
    try {
      const data = await api.get<{ summary: AdminSummary }>(
        '/admin/summary',
        token.value || undefined
      )
      summary.value = data.summary
    } catch (e: any) {
      error.value = e.message || 'Error al cargar resumen'
    }
  }

  async function fetchUserDetail(id: number, force = false) {
    if (details.value[id] && !force) return details.value[id]
    detailLoadingId.value = id
    actionError.value = ''
    try {
      const data = await api.get<AdminUserDetail>(`/admin/users/${id}`, token.value || undefined)
      details.value = { ...details.value, [id]: data }
      return data
    } catch (e: any) {
      actionError.value = e.message || 'Error al cargar el detalle'
      return null
    } finally {
      detailLoadingId.value = null
    }
  }

  async function updateRole(id: number, role: 'admin' | 'user') {
    actionError.value = ''
    try {
      await api.patch<{ id: number; role: string }>(
        `/admin/users/${id}/role`,
        { role },
        token.value || undefined
      )
      users.value = users.value.map((u) => (u.id === id ? { ...u, role } : u))
      if (details.value[id]) {
        details.value = { ...details.value, [id]: { ...details.value[id], role } }
      }
      return true
    } catch (e: any) {
      actionError.value = e.message || 'Error al cambiar el rol'
      return false
    }
  }

  async function deleteUser(id: number) {
    actionError.value = ''
    try {
      await api.delete<void>(`/admin/users/${id}`, token.value || undefined)
      users.value = users.value.filter((u) => u.id !== id)
      const next = { ...details.value }
      delete next[id]
      details.value = next
      return true
    } catch (e: any) {
      actionError.value = e.message || 'Error al eliminar el usuario'
      return false
    }
  }

  function clearError() {
    error.value = ''
    actionError.value = ''
  }

  return {
    users,
    summary,
    loading,
    error,
    details,
    detailLoadingId,
    actionError,
    fetchUsers,
    fetchSummary,
    fetchUserDetail,
    updateRole,
    deleteUser,
    clearError,
  }
}
