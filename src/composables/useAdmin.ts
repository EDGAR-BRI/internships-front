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

const users = ref<AdminUser[]>([])
const summary = ref<AdminSummary | null>(null)
const loading = ref(false)
const error = ref('')

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

  return {
    users,
    summary,
    loading,
    error,
    fetchUsers,
    fetchSummary,
  }
}
