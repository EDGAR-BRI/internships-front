import { ref } from 'vue'
import { api } from '../lib/api'
import { useAuth } from './useAuth'

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
  targetEndDate: string | null
  estimatedEndDate: string | null
  pace: {
    daysPerWeek: number
    hoursPerWeek: number
  }
}

const attendances = ref<Attendance[]>([])
const summary = ref<AttendanceSummary | null>(null)
const loading = ref(false)
const error = ref('')

function todayInMexicoCity(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

export function useAttendances() {
  const { token } = useAuth()

  async function fetchAttendances() {
    loading.value = true
    error.value = ''
    try {
      const data = await api.get<Attendance[]>('/attendances', token.value || undefined)
      attendances.value = data
    } catch (e: any) {
      error.value = e.message || 'Error al cargar asistencias'
    } finally {
      loading.value = false
    }
  }

  async function fetchSummary() {
    error.value = ''
    try {
      const data = await api.get<{ summary: AttendanceSummary }>(
        '/attendances/summary',
        token.value || undefined
      )
      summary.value = data.summary
    } catch (e: any) {
      error.value = e.message || 'Error al cargar resumen'
    }
  }

  async function checkIn(date?: string, isFullDay?: boolean, mode?: Attendance['mode']) {
    error.value = ''
    try {
      const data = await api.post<Attendance>(
        '/attendances/check-in',
        { date: date || todayInMexicoCity(), isFullDay, mode },
        token.value || undefined
      )
      attendances.value.unshift(data)
      return data
    } catch (e: any) {
      error.value = e.message || 'Error al registrar entrada'
      throw e
    }
  }

  async function checkOut(date?: string) {
    error.value = ''
    try {
      const data = await api.post<Attendance>(
        '/attendances/check-out',
        { date: date || todayInMexicoCity() },
        token.value || undefined
      )
      const index = attendances.value.findIndex((a) => a.id === data.id)
      if (index !== -1) {
        attendances.value[index] = data
      } else {
        attendances.value.unshift(data)
      }
      return data
    } catch (e: any) {
      error.value = e.message || 'Error al registrar salida'
      throw e
    }
  }

  async function registerFullDay(date?: string, mode?: Attendance['mode']) {
    error.value = ''
    try {
      const data = await api.post<Attendance>(
        '/attendances/full-day',
        { date: date || todayInMexicoCity(), mode },
        token.value || undefined
      )
      const index = attendances.value.findIndex((a) => a.id === data.id)
      if (index !== -1) {
        attendances.value[index] = data
      } else {
        attendances.value.unshift(data)
      }
      return data
    } catch (e: any) {
      error.value = e.message || 'Error al registrar día completo'
      throw e
    }
  }

  async function registerPartial(date: string, hours: number, mode?: Attendance['mode']) {
    error.value = ''
    try {
      const data = await api.post<Attendance>(
        '/attendances/partial',
        { date, hours, mode },
        token.value || undefined
      )
      const index = attendances.value.findIndex((a) => a.id === data.id)
      if (index !== -1) {
        attendances.value[index] = data
      } else {
        attendances.value.unshift(data)
      }
      return data
    } catch (e: any) {
      error.value = e.message || 'Error al registrar horas parciales'
      throw e
    }
  }

  async function updateAttendance(
    id: number,
    payload: { date?: string; isFullDay?: boolean; hours?: number; mode?: Attendance['mode'] }
  ) {
    error.value = ''
    try {
      const data = await api.put<Attendance>(
        `/attendances/${id}`,
        payload,
        token.value || undefined
      )
      const index = attendances.value.findIndex((a) => a.id === data.id)
      if (index !== -1) {
        attendances.value[index] = data
      }
      return data
    } catch (e: any) {
      error.value = e.message || 'Error al actualizar asistencia'
      throw e
    }
  }

  async function deleteAttendance(id: number) {
    error.value = ''
    try {
      await api.delete(`/attendances/${id}`, token.value || undefined)
      attendances.value = attendances.value.filter((a) => a.id !== id)
    } catch (e: any) {
      error.value = e.message || 'Error al eliminar asistencia'
      throw e
    }
  }

  function attendanceForDate(dateStr: string): Attendance | undefined {
    return attendances.value.find((a) => a.date.startsWith(dateStr))
  }

  return {
    attendances,
    summary,
    loading,
    error,
    fetchAttendances,
    fetchSummary,
    checkIn,
    checkOut,
    registerFullDay,
    registerPartial,
    updateAttendance,
    deleteAttendance,
    attendanceForDate,
  }
}
