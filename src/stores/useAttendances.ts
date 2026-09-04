import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api, OfflineQueuedError } from '../lib/api'
import { useAuthStore } from './useAuth'
import { registerReset, canPersist, persistStorage } from './registry'
import { isFresh } from './ttl'

export interface Attendance {
  id: number
  userId: number
  date: string
  checkIn: string | null
  checkOut: string | null
  isFullDay: boolean | null
  hours: number
  mode: 'on_site' | 'remote' | null
  createdAt: string
  updatedAt: string
}

export interface AttendanceSummary {
  totalDays: number
  totalHours: number
  fullDayHours: number
  completedDays: number
  completedHours: number
  remainingDays: number
  remainingHours: number
  onSiteDays: number
  remoteDays: number
  totalWeeks: number
  completedWeeks: number
  remainingWeeks: number
  targetEndDate: string | null
  estimatedEndDate: string | null
  pace: {
    daysPerWeek: number
    hoursPerWeek: number
  }
}

function todayInMexicoCity(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

export const useAttendancesStore = defineStore(
  'attendances',
  () => {
    const attendances = ref<Attendance[]>([])
    const summary = ref<AttendanceSummary | null>(null)
    const loading = ref(false)
    const error = ref('')
    const lastFetched = ref(0)
    const summaryFetched = ref(0)

    function touch() {
      lastFetched.value = Date.now()
    }

    function invalidateSummary() {
      summaryFetched.value = 0
    }

    async function fetchAttendances() {
      const auth = useAuthStore()
      if (isFresh(lastFetched.value)) return

      const background = attendances.value.length > 0
      if (!background) loading.value = true
      error.value = ''

      try {
        const data = await api.get<Attendance[]>('/attendances', auth.token || undefined)
        attendances.value = data
        lastFetched.value = Date.now()
      } catch (e: any) {
        if (!background) error.value = e.message || 'Error al cargar asistencias'
      } finally {
        if (!background) loading.value = false
      }
    }

    async function fetchSummary() {
      const auth = useAuthStore()
      if (isFresh(summaryFetched.value)) return

      error.value = ''
      try {
        const data = await api.get<{ summary: AttendanceSummary }>(
          '/attendances/summary',
          auth.token || undefined
        )
        summary.value = data.summary
        summaryFetched.value = Date.now()
      } catch (e: any) {
        error.value = e.message || 'Error al cargar resumen'
      }
    }

    function localAttendance(partial: Partial<Attendance>): Attendance {
      const now = new Date().toISOString()
      return {
        id: -Date.now(),
        userId: 0,
        date: todayInMexicoCity(),
        checkIn: null,
        checkOut: null,
        isFullDay: null,
        hours: 0,
        mode: null,
        createdAt: now,
        updatedAt: now,
        ...partial,
      }
    }

    function upsertLocal(att: Attendance) {
      const index = attendances.value.findIndex((a) => a.id === att.id)
      if (index !== -1) {
        attendances.value[index] = att
      } else {
        attendances.value.unshift(att)
      }
    }

    async function checkIn(date?: string, isFullDay?: boolean, mode?: Attendance['mode']) {
      const auth = useAuthStore()
      error.value = ''
      try {
        const data = await api.post<Attendance>(
          '/attendances/check-in',
          { date: date || todayInMexicoCity(), isFullDay, mode },
          auth.token || undefined
        )
        upsertLocal(data)
        touch()
        invalidateSummary()
        return data
      } catch (e: any) {
        if (e instanceof OfflineQueuedError) {
          const local = localAttendance({ date: date || todayInMexicoCity(), isFullDay, mode })
          upsertLocal(local)
          touch()
          invalidateSummary()
          throw e
        }
        error.value = e.message || 'Error al registrar entrada'
        throw e
      }
    }

    async function checkOut(date?: string) {
      const auth = useAuthStore()
      error.value = ''
      try {
        const data = await api.post<Attendance>(
          '/attendances/check-out',
          { date: date || todayInMexicoCity() },
          auth.token || undefined
        )
        upsertLocal(data)
        touch()
        invalidateSummary()
        return data
      } catch (e: any) {
        if (e instanceof OfflineQueuedError) {
          const now = new Date().toISOString()
          const target = attendanceForDate(date || todayInMexicoCity())
          if (target) {
            target.checkOut = now
            upsertLocal({ ...target })
          } else {
            upsertLocal(localAttendance({ date: date || todayInMexicoCity(), checkIn: now, checkOut: now }))
          }
          touch()
          invalidateSummary()
          throw e
        }
        error.value = e.message || 'Error al registrar salida'
        throw e
      }
    }

    async function registerFullDay(date?: string, mode?: Attendance['mode']) {
      const auth = useAuthStore()
      error.value = ''
      try {
        const data = await api.post<Attendance>(
          '/attendances/full-day',
          { date: date || todayInMexicoCity(), mode },
          auth.token || undefined
        )
        upsertLocal(data)
        touch()
        invalidateSummary()
        return data
      } catch (e: any) {
        if (e instanceof OfflineQueuedError) {
          upsertLocal(localAttendance({ date: date || todayInMexicoCity(), isFullDay: true, mode }))
          touch()
          invalidateSummary()
          throw e
        }
        error.value = e.message || 'Error al registrar día completo'
        throw e
      }
    }

    async function registerPartial(
      date: string,
      hours: number,
      mode?: Attendance['mode'],
      checkIn?: string,
      checkOut?: string
    ) {
      const auth = useAuthStore()
      error.value = ''
      try {
        const data = await api.post<Attendance>(
          '/attendances/partial',
          { date, hours, mode, checkIn, checkOut },
          auth.token || undefined
        )
        upsertLocal(data)
        touch()
        invalidateSummary()
        return data
      } catch (e: any) {
        if (e instanceof OfflineQueuedError) {
          upsertLocal(localAttendance({ date, hours, mode, checkIn, checkOut }))
          touch()
          invalidateSummary()
          throw e
        }
        error.value = e.message || 'Error al registrar horas parciales'
        throw e
      }
    }

    async function bulkRegister(payload: {
      dates: string[]
      isFullDay?: boolean
      hours?: number
      mode?: Attendance['mode']
      checkIn?: string
      checkOut?: string
    }) {
      const auth = useAuthStore()
      error.value = ''
      try {
        const data = await api.post<{ created: number; skipped: number; attendances: Attendance[] }>(
          '/attendances/bulk',
          payload,
          auth.token || undefined
        )
        for (const att of data.attendances) upsertLocal(att)
        touch()
        invalidateSummary()
        return data
      } catch (e: any) {
        if (e instanceof OfflineQueuedError) {
          for (const d of payload.dates) {
            upsertLocal(
              localAttendance({
                date: d,
                isFullDay: payload.isFullDay,
                hours: payload.hours,
                mode: payload.mode,
                checkIn: payload.checkIn,
                checkOut: payload.checkOut,
              })
            )
          }
          touch()
          invalidateSummary()
          throw e
        }
        error.value = e.message || 'Error al registrar asistencias en lote'
        throw e
      }
    }

    async function updateAttendance(
      id: number,
      payload: {
        date?: string
        isFullDay?: boolean
        hours?: number
        mode?: Attendance['mode']
        checkIn?: string
        checkOut?: string
      }
    ) {
      const auth = useAuthStore()
      error.value = ''
      try {
        const data = await api.put<Attendance>(
          `/attendances/${id}`,
          payload,
          auth.token || undefined
        )
        upsertLocal(data)
        touch()
        invalidateSummary()
        return data
      } catch (e: any) {
        if (e instanceof OfflineQueuedError) {
          const index = attendances.value.findIndex((a) => a.id === id)
          if (index !== -1) {
            attendances.value[index] = { ...attendances.value[index], ...payload }
          }
          touch()
          invalidateSummary()
          throw e
        }
        error.value = e.message || 'Error al actualizar asistencia'
        throw e
      }
    }

    async function deleteAttendance(id: number) {
      const auth = useAuthStore()
      error.value = ''
      try {
        await api.delete(`/attendances/${id}`, auth.token || undefined)
        attendances.value = attendances.value.filter((a) => a.id !== id)
        touch()
        invalidateSummary()
      } catch (e: any) {
        if (e instanceof OfflineQueuedError) {
          attendances.value = attendances.value.filter((a) => a.id !== id)
          touch()
          invalidateSummary()
          throw e
        }
        error.value = e.message || 'Error al eliminar asistencia'
        throw e
      }
    }

    function attendanceForDate(dateStr: string): Attendance | undefined {
      return attendances.value.find((a) => a.date.startsWith(dateStr))
    }

    function reset() {
      attendances.value = []
      summary.value = null
      loading.value = false
      error.value = ''
      lastFetched.value = 0
      summaryFetched.value = 0
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('sync-flushed', () => {
        lastFetched.value = 0
        summaryFetched.value = 0
        fetchAttendances()
        fetchSummary()
      })
    }

    registerReset(reset)

    return {
      attendances,
      summary,
      loading,
      error,
      lastFetched,
      summaryFetched,
      fetchAttendances,
      fetchSummary,
      checkIn,
      checkOut,
      registerFullDay,
      registerPartial,
      bulkRegister,
      updateAttendance,
      deleteAttendance,
      attendanceForDate,
      reset,
    }
  },
  {
    persist: canPersist
      ? {
          key: 'attendances',
          storage: persistStorage!,
          pick: ['attendances', 'summary', 'lastFetched', 'summaryFetched'],
        }
      : false,
  }
)
