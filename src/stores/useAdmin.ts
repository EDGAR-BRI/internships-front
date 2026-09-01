import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../lib/api'
import { useAuthStore } from './useAuth'
import { registerReset, canPersist, persistStorage } from './registry'
import { isFresh } from './ttl'

export interface Plan {
  id: number
  slug: string
  name: string
  notesPerDay: number | null
  logEntriesPerDay: number | null
  attendancesPerDay: number | null
  attendancesPerDayFirstDay: number | null
  canExport: boolean
  canExportAttendance: boolean
  isDefault: boolean
}

export interface UpgradeRequest {
  id: number
  planSlug: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  user: {
    id: number
    fullName: string | null
    email: string
    initials: string
  }
}

export interface UserPlanInfo {
  slug: string
  name: string
  expiresAt: string | null
}

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
  plan: UserPlanInfo
}

export interface AdminSummary {
  totalUsers: number
  activeUsers: number
  totalHours: number
  totalNotes: number
  totalLogEntries: number
}

export interface UserUsageDetail {
  used: number
  limit: number | null
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
  plan: UserPlanInfo
  usage: {
    notes: UserUsageDetail
    logEntries: UserUsageDetail
    attendances: UserUsageDetail
  }
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

export const useAdminStore = defineStore(
  'admin',
  () => {
    const users = ref<AdminUser[]>([])
    const summary = ref<AdminSummary | null>(null)
    const loading = ref(false)
    const error = ref('')
    const details = ref<Record<number, AdminUserDetail>>({})
    const detailLoadingId = ref<number | null>(null)
    const actionError = ref('')
    const plans = ref<Plan[]>([])
    const plansLoading = ref(false)
    const upgradeRequests = ref<UpgradeRequest[]>([])
    const requestsLoading = ref(false)

    const usersFetched = ref(0)
    const summaryFetched = ref(0)
    const plansFetched = ref(0)
    const requestsFetched = ref(0)

    async function fetchUsers() {
      const auth = useAuthStore()
      if (isFresh(usersFetched.value)) return

      const background = users.value.length > 0
      if (!background) loading.value = true
      error.value = ''

      try {
        const data = await api.get<AdminUser[]>('/admin/users', auth.token || undefined)
        users.value = data
        usersFetched.value = Date.now()
      } catch (e: any) {
        if (!background) error.value = e.message || 'Error al cargar usuarios'
      } finally {
        if (!background) loading.value = false
      }
    }

    async function fetchSummary() {
      const auth = useAuthStore()
      if (isFresh(summaryFetched.value)) return

      error.value = ''
      try {
        const data = await api.get<{ summary: AdminSummary }>(
          '/admin/summary',
          auth.token || undefined
        )
        summary.value = data.summary
        summaryFetched.value = Date.now()
      } catch (e: any) {
        error.value = e.message || 'Error al cargar resumen'
      }
    }

    async function fetchUserDetail(id: number, force = false) {
      const auth = useAuthStore()
      if (details.value[id] && !force) return details.value[id]
      detailLoadingId.value = id
      actionError.value = ''
      try {
        const data = await api.get<AdminUserDetail>(
          `/admin/users/${id}`,
          auth.token || undefined
        )
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
      const auth = useAuthStore()
      actionError.value = ''
      try {
        await api.patch<{ id: number; role: string }>(
          `/admin/users/${id}/role`,
          { role },
          auth.token || undefined
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
      const auth = useAuthStore()
      actionError.value = ''
      try {
        await api.delete<void>(`/admin/users/${id}`, auth.token || undefined)
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

    async function assignPlan(id: number, planSlug: string, expiresAt?: string | null) {
      const auth = useAuthStore()
      actionError.value = ''
      try {
        const data = await api.put<{ id: number; plan: UserPlanInfo }>(
          `/admin/users/${id}/subscription`,
          { planSlug, expiresAt: expiresAt ?? null },
          auth.token || undefined
        )
        users.value = users.value.map((u) => (u.id === id ? { ...u, plan: data.plan } : u))
        if (details.value[id]) {
          details.value = { ...details.value, [id]: { ...details.value[id], plan: data.plan } }
        }
        return true
      } catch (e: any) {
        actionError.value = e.message || 'Error al asignar el plan'
        return false
      }
    }

    async function fetchPlans() {
      const auth = useAuthStore()
      if (isFresh(plansFetched.value)) return

      const background = plans.value.length > 0
      if (!background) plansLoading.value = true
      actionError.value = ''

      try {
        const data = await api.get<Plan[]>('/admin/plans', auth.token || undefined)
        plans.value = data
        plansFetched.value = Date.now()
      } catch (e: any) {
        if (!background) actionError.value = e.message || 'Error al cargar planes'
      } finally {
        if (!background) plansLoading.value = false
      }
    }

    async function createPlan(payload: Partial<Plan> & { slug: string; name: string }) {
      const auth = useAuthStore()
      actionError.value = ''
      try {
        const data = await api.post<{ plan: Plan }>('/admin/plans', payload, auth.token || undefined)
        plans.value = [...plans.value, data.plan]
        plansFetched.value = Date.now()
        return data.plan
      } catch (e: any) {
        actionError.value = e.message || 'Error al crear el plan'
        return null
      }
    }

    async function updatePlan(id: number, payload: Partial<Plan>) {
      const auth = useAuthStore()
      actionError.value = ''
      try {
        const data = await api.put<{ plan: Plan }>(
          `/admin/plans/${id}`,
          payload,
          auth.token || undefined
        )
        plans.value = plans.value.map((p) => (p.id === id ? data.plan : p))
        plansFetched.value = Date.now()
        return data.plan
      } catch (e: any) {
        actionError.value = e.message || 'Error al actualizar el plan'
        return null
      }
    }

    async function deletePlan(id: number) {
      const auth = useAuthStore()
      actionError.value = ''
      try {
        await api.delete<void>(`/admin/plans/${id}`, auth.token || undefined)
        plans.value = plans.value.filter((p) => p.id !== id)
        plansFetched.value = Date.now()
        return true
      } catch (e: any) {
        actionError.value = e.message || 'Error al eliminar el plan'
        return false
      }
    }

    async function fetchUpgradeRequests() {
      const auth = useAuthStore()
      if (isFresh(requestsFetched.value)) return

      const background = upgradeRequests.value.length > 0
      if (!background) requestsLoading.value = true
      actionError.value = ''

      try {
        const data = await api.get<{ upgradeRequests: UpgradeRequest[] }>(
          '/admin/upgrade-requests',
          auth.token || undefined
        )
        upgradeRequests.value = data.upgradeRequests
        requestsFetched.value = Date.now()
      } catch (e: any) {
        if (!background) actionError.value = e.message || 'Error al cargar solicitudes'
      } finally {
        if (!background) requestsLoading.value = false
      }
    }

    async function approveUpgradeRequest(id: number) {
      const auth = useAuthStore()
      actionError.value = ''
      try {
        await api.post<unknown>(
          `/admin/upgrade-requests/${id}/approve`,
          {},
          auth.token || undefined
        )
        upgradeRequests.value = upgradeRequests.value.filter((r) => r.id !== id)
        return true
      } catch (e: any) {
        actionError.value = e.message || 'Error al aprobar la solicitud'
        return false
      }
    }

    async function rejectUpgradeRequest(id: number) {
      const auth = useAuthStore()
      actionError.value = ''
      try {
        await api.post<unknown>(
          `/admin/upgrade-requests/${id}/reject`,
          {},
          auth.token || undefined
        )
        upgradeRequests.value = upgradeRequests.value.filter((r) => r.id !== id)
        return true
      } catch (e: any) {
        actionError.value = e.message || 'Error al rechazar la solicitud'
        return false
      }
    }

    function clearError() {
      error.value = ''
      actionError.value = ''
    }

    function reset() {
      users.value = []
      summary.value = null
      loading.value = false
      error.value = ''
      details.value = {}
      detailLoadingId.value = null
      actionError.value = ''
      plans.value = []
      plansLoading.value = false
      upgradeRequests.value = []
      requestsLoading.value = false
      usersFetched.value = 0
      summaryFetched.value = 0
      plansFetched.value = 0
      requestsFetched.value = 0
    }

    registerReset(reset)

    return {
      users,
      summary,
      loading,
      error,
      details,
      detailLoadingId,
      actionError,
      plans,
      plansLoading,
      upgradeRequests,
      requestsLoading,
      usersFetched,
      summaryFetched,
      plansFetched,
      requestsFetched,
      fetchUsers,
      fetchSummary,
      fetchUserDetail,
      updateRole,
      deleteUser,
      assignPlan,
      fetchPlans,
      createPlan,
      updatePlan,
      deletePlan,
      fetchUpgradeRequests,
      approveUpgradeRequest,
      rejectUpgradeRequest,
      clearError,
      reset,
    }
  },
  {
    persist: canPersist
      ? {
          key: 'admin',
          storage: persistStorage!,
          pick: [
            'users',
            'summary',
            'details',
            'plans',
            'upgradeRequests',
            'usersFetched',
            'summaryFetched',
            'plansFetched',
            'requestsFetched',
          ],
        }
      : false,
  }
)
