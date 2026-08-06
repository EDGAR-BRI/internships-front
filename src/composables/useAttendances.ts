import { toRef } from 'vue'
import pinia from '../stores/pinia'
import {
  useAttendancesStore,
  type Attendance,
  type AttendanceSummary,
} from '../stores/useAttendances'

export type { Attendance, AttendanceSummary }

export function useAttendances() {
  const store = useAttendancesStore(pinia)
  return {
    attendances: toRef(store, 'attendances'),
    summary: toRef(store, 'summary'),
    loading: toRef(store, 'loading'),
    error: toRef(store, 'error'),
    fetchAttendances: store.fetchAttendances,
    fetchSummary: store.fetchSummary,
    checkIn: store.checkIn,
    checkOut: store.checkOut,
    registerFullDay: store.registerFullDay,
    registerPartial: store.registerPartial,
    updateAttendance: store.updateAttendance,
    deleteAttendance: store.deleteAttendance,
    attendanceForDate: store.attendanceForDate,
  }
}
