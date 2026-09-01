<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAttendances, type Attendance } from '../composables/useAttendances'
import { useSettings } from '../composables/useSettings'
import { useAuth } from '../composables/useAuth'
import { useSubscription } from '../composables/useSubscription'
import { computeWeek } from '../utils/week'
import { buildAttendanceDocx, downloadDocx } from '../utils/exportAttendanceDocx'
import AttendanceCalendar from './AttendanceCalendar.vue'
import AttendanceEditModal from './AttendanceEditModal.vue'
import AttendanceCharts from './AttendanceCharts.vue'
import AttendanceModeBar from './AttendanceModeBar.vue'
import FeatureTour from './FeatureTour.vue'
import AttendanceExportNoticeModal from './AttendanceExportNoticeModal.vue'

const {
  attendances,
  summary,
  loading,
  error,
  fetchAttendances,
  fetchSummary,
  registerFullDay,
  registerPartial,
  deleteAttendance,
  attendanceForDate,
} = useAttendances()

const { settings, fetchSettings } = useSettings()
const { user } = useAuth()
const { mySubscription, fetchMySubscription } = useSubscription()

const exporting = ref(false)
const exportConfirmOpen = ref(false)
const missingData = ref<string[]>([])

const canExport = computed(() => mySubscription.value?.canExportAttendance ?? true)

function missingExportData(): string[] {
  const missing: string[] = []
  if (!settings.value?.tutorName?.trim()) missing.push('Nombre del tutor empresarial')
  if (!settings.value?.ci?.trim()) missing.push('C.I.')
  if (!settings.value?.workStartTime || !settings.value?.workEndTime) {
    missing.push('Horas de jornada (entrada y salida)')
  }
  return missing
}

async function doExport() {
  if (exporting.value) return
  exporting.value = true
  try {
    await Promise.all([fetchAttendances(), fetchSummary(), fetchSettings(true)])
    if (error.value) throw new Error(error.value)
    const blob = await buildAttendanceDocx({
      fullName: user.value?.fullName ?? null,
      settings: settings.value,
      attendances: attendances.value,
      summary: summary.value,
    })
    downloadDocx(blob)
  } catch (e) {
    console.error('Error al exportar la asistencia', e)
  } finally {
    exporting.value = false
  }
}

async function handleExport() {
  if (!canExport.value) {
    window.dispatchEvent(
      new CustomEvent('upgrade-offer', {
        detail: {
          message:
            'La exportación del control de asistencia está disponible en el plan Pro. ¡Bríndale un tostón a Edgar y actívalo para exportar tus asistencias!',
        },
      })
    )
    return
  }
  missingData.value = missingExportData()
  if (missingData.value.length > 0) {
    exportConfirmOpen.value = true
    return
  }
  await doExport()
}

function exportAnyway() {
  exportConfirmOpen.value = false
  doExport()
}

function completeExportData() {
  exportConfirmOpen.value = false
  openSettingsModal()
}

function closeExportConfirm() {
  exportConfirmOpen.value = false
}

function openSettingsModal() {
  window.dispatchEvent(new CustomEvent('open-settings-modal'))
}

const mode = ref<'full' | 'partial'>('full')
const selectedDate = ref(todayInMexicoCity())
const partialHours = ref<number | ''>('')
const partialStartTime = ref('')
const partialEndTime = ref('')
const endTimeTouched = ref(false)
const actionLoading = ref(false)
const actionError = ref('')

const attendanceMode = ref<'on_site' | 'remote'>('on_site')

const editTarget = ref<Attendance | null>(null)
const editModalOpen = ref(false)

const historyView = ref<'list' | 'calendar'>('list')
const filterType = ref<'all' | 'full' | 'partial'>('all')
const filterMode = ref<'all' | 'on_site' | 'remote'>('all')
const filterMonth = ref('all')

const deleteId = ref<number | null>(null)
const deleteConfirmText = ref('')
const deleteLoading = ref(false)
const deleteError = ref('')

const today = computed(() =>
  new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Mexico_City',
  })
)

const availableMonths = computed(() => {
  const map = new Map<string, string>()
  for (const a of attendances.value) {
    const month = a.date.slice(0, 7)
    if (!map.has(month)) {
      const [y, m] = month.split('-').map(Number)
      map.set(
        month,
        new Date(y, m - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
      )
    }
  }
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
})

const filteredAttendances = computed(() => {
  let list = [...attendances.value]
  if (filterType.value !== 'all') {
    list = list.filter((a) =>
      filterType.value === 'full' ? !!a.isFullDay : !a.isFullDay
    )
  }
  if (filterMode.value !== 'all') {
    list = list.filter((a) => a.mode === filterMode.value)
  }
  if (filterMonth.value !== 'all') {
    list = list.filter((a) => a.date.slice(0, 7) === filterMonth.value)
  }
  return list
})

const selectedAtt = computed(() => attendanceForDate(selectedDate.value))

const fullDayDone = computed(() => {
  if (mode.value !== 'full') return false
  return !!selectedAtt.value && !!selectedAtt.value.isFullDay
})

const partialDone = computed(() => {
  if (mode.value !== 'partial') return false
  return !!selectedAtt.value && selectedAtt.value.hours > 0 && !selectedAtt.value.isFullDay
})

watch(selectedAtt, (att) => {
  if (att && att.hours > 0 && !att.isFullDay) {
    partialHours.value = att.hours
    if (att.checkIn) partialStartTime.value = formatTime(att.checkIn)
    if (att.checkOut) partialEndTime.value = formatTime(att.checkOut)
    endTimeTouched.value = !!att.checkOut
  } else {
    partialHours.value = summary.value?.fullDayHours || settings.value?.workHoursPerDay || 8
    partialStartTime.value = settings.value?.workStartTime || '08:00'
    partialEndTime.value = ''
    endTimeTouched.value = false
  }
})

watch(partialHours, () => {
  if (partialStartTime.value && partialHours.value && !endTimeTouched.value) {
    partialEndTime.value = addHoursToTime(partialStartTime.value, Number(partialHours.value))
  }
})

watch(partialStartTime, () => {
  if (partialStartTime.value && partialHours.value && !endTimeTouched.value) {
    partialEndTime.value = addHoursToTime(partialStartTime.value, Number(partialHours.value))
  }
})

function addHoursToTime(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return ''
  const total = (h * 60 + m + hours * 60) % 1440
  const hh = String(Math.floor(total / 60)).padStart(2, '0')
  const mm = String(total % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

const hasSettings = computed(() => !!summary.value?.targetEndDate)

const currentWeek = computed(() => {
  if (!settings.value?.startDate) return null
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  return computeWeek(settings.value.startDate.slice(0, 10), todayStr, settings.value.skippedWeeks)
})

const daysProgress = computed(() => {
  if (!summary.value) return 0
  return Math.min((summary.value.completedDays / summary.value.totalDays) * 100, 100)
})

const hoursProgress = computed(() => {
  if (!summary.value) return 0
  return Math.min((summary.value.completedHours / summary.value.totalHours) * 100, 100)
})

const weeksProgress = computed(() => {
  if (!summary.value || !summary.value.totalWeeks) return 0
  return Math.min((summary.value.completedWeeks / summary.value.totalWeeks) * 100, 100)
})

const currentDayName = computed(() => {
  return new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    timeZone: 'America/Mexico_City',
  }).toLowerCase()
})

function normalizeDay(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

const canDelete = computed(() => {
  return normalizeDay(deleteConfirmText.value) === normalizeDay(currentDayName.value)
})

function todayInMexicoCity(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

const tourSteps = [
  {
    target: '[data-tour="attendance-register"]',
    title: 'Registra tu asistencia',
    text: 'Elige la fecha y registra tu entrada. Puedes marcar día completo o parcial, y si trabajas presencial o remoto.',
    placement: 'top' as const,
  },
  {
    target: '[data-tour="attendance-mode"]',
    title: 'Día completo o parcial',
    text: 'Con "Día completo" se cuentan automáticamente tus horas de jornada. Con "Parcial" indicas las horas exactas que trabajaste.',
    placement: 'top' as const,
  },
  {
    target: '[data-tour="attendance-history"]',
    title: 'Historial y calendario',
    text: 'Revisa tus asistencias pasadas en lista o en vista de calendario. Puedes editar o eliminar cada registro.',
    placement: 'top' as const,
  },
]

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City',
  })
}

function formatDateShort(iso: string): string {
  const parts = iso.slice(0, 10).split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => isNaN(n))) return iso
  const [y, m, d] = parts
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  })
}

function weekForDate(iso: string): number | null {
  if (!settings.value?.startDate) return null
  return computeWeek(
    settings.value.startDate.slice(0, 10),
    iso.slice(0, 10),
    settings.value.skippedWeeks
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const parts = iso.slice(0, 10).split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => isNaN(n))) return iso
  const [y, m, d] = parts
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function startEdit(a: typeof attendances.value[0]) {
  editTarget.value = a
  editModalOpen.value = true
}

function closeEditModal() {
  editModalOpen.value = false
  editTarget.value = null
}

async function handleEditSaved() {
  await fetchSummary()
}

function openDelete(a: typeof attendances.value[0]) {
  deleteId.value = a.id
  deleteConfirmText.value = ''
  deleteError.value = ''
}

function closeDelete() {
  deleteId.value = null
  deleteConfirmText.value = ''
  deleteError.value = ''
}

async function handleDelete() {
  if (!deleteId.value) return
  deleteLoading.value = true
  deleteError.value = ''
  try {
    await deleteAttendance(deleteId.value)
    deleteId.value = null
    await fetchSummary()
  } catch (e: any) {
    deleteError.value = e.message || 'Error al eliminar'
  } finally {
    deleteLoading.value = false
  }
}

async function handlePartial() {
  actionLoading.value = true
  actionError.value = ''
  try {
    const hours = Number(partialHours.value)
    if (!hours || hours <= 0 || hours > 10) {
      actionError.value = 'Ingresa una cantidad válida de horas (máximo 10h)'
      return
    }
    await registerPartial(
      selectedDate.value,
      hours,
      attendanceMode.value,
      partialStartTime.value || undefined,
      partialEndTime.value || undefined
    )
    partialHours.value = ''
    endTimeTouched.value = false
    await fetchSummary()
  } catch (e: any) {
    actionError.value = e.message || 'Error'
  } finally {
    actionLoading.value = false
  }
}

async function handleFullDay() {
  actionLoading.value = true
  actionError.value = ''
  try {
    await registerFullDay(selectedDate.value, attendanceMode.value)
    await fetchSummary()
  } catch (e: any) {
    actionError.value = e.message || 'Error'
  } finally {
    actionLoading.value = false
  }
}

onMounted(() => {
  fetchAttendances()
  fetchSummary()
  fetchSettings()
  fetchMySubscription()
  window.addEventListener('settings-saved', fetchSummary)
})

onUnmounted(() => {
  window.removeEventListener('settings-saved', fetchSummary)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header / Fecha -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-semibold text-text">Asistencia</h1>
        <p class="text-sm text-text-muted capitalize">{{ today }}</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          @click="handleExport"
          :disabled="exporting"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {{ exporting ? 'Exportando…' : 'Exportar asistencia' }}
        </button>
        <div v-if="currentWeek" class="text-right">
          <p class="text-xs text-text-muted">Semana de pasantía</p>
          <p class="text-lg font-bold text-accent">{{ currentWeek }}</p>
        </div>
      </div>
    </div>

    <!-- Error global -->
    <div v-if="error" class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-3">
      {{ error }}
    </div>

    <!-- Configuración del período -->
    <div v-if="settings" class="bg-surface border border-border rounded-lg p-4">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-sm font-semibold text-text">Período de pasantía</h2>
        <button @click="openSettingsModal" class="text-xs text-accent hover:underline">Editar en ajustes →</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
        <div>
          <p class="text-xs text-text-muted">Inicio</p>
          <p class="text-text font-medium">{{ formatDate(settings.startDate) }}</p>
        </div>
        <div>
          <p class="text-xs text-text-muted">Fin configurado</p>
          <p class="text-text font-medium">{{ formatDate(settings.endDate) }}</p>
        </div>
        <div>
          <p class="text-xs text-text-muted">Jornada</p>
          <p class="text-text font-medium">
            {{ settings.workType === 'full' ? 'Día completo' : settings.workType === 'partial' ? 'Parcial' : '—' }}
            <span v-if="settings.workHoursPerDay">({{ settings.workHoursPerDay }}h)</span>
          </p>
        </div>
        <div>
          <p class="text-xs text-text-muted">Días por semana</p>
          <p class="text-text font-medium">{{ settings.daysPerWeek ?? 5 }}</p>
        </div>
        <div>
          <p class="text-xs text-text-muted">Semanas omitidas</p>
          <p class="text-text font-medium">{{ settings.skippedWeeks?.join(', ') || 'Ninguna' }}</p>
        </div>
      </div>
    </div>

    <div v-if="!hasSettings && !loading" class="bg-warning/10 border border-warning/20 text-warning text-sm rounded-md p-3">
      No tienes configurado el período de pasantía.
      <button @click="openSettingsModal" class="underline font-medium">Configúralo aquí</button>
      para ver el cálculo de días restantes y la fecha estimada de fin.
    </div>

    <!-- Progreso -->
    <div v-if="summary" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Días -->
      <div class="bg-surface border border-border rounded-lg p-4 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-text-secondary">Días completados</span>
          <span class="text-sm font-semibold text-text">{{ summary.completedDays }} / {{ summary.totalDays }}</span>
        </div>
        <div class="h-2 bg-overlay rounded-full overflow-hidden">
          <div class="h-full bg-accent rounded-full transition-all" :style="{ width: daysProgress + '%' }"></div>
        </div>
        <p class="text-xs text-text-muted">
          Te faltan <span class="text-text font-medium">{{ summary.remainingDays }} días</span>
        </p>
      </div>

      <!-- Horas -->
      <div class="bg-surface border border-border rounded-lg p-4 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-text-secondary">Horas acumuladas</span>
          <span class="text-sm font-semibold text-text">{{ summary.completedHours }}h / {{ summary.totalHours }}h</span>
        </div>
        <div class="h-2 bg-overlay rounded-full overflow-hidden">
          <div class="h-full bg-accent rounded-full transition-all" :style="{ width: hoursProgress + '%' }"></div>
        </div>
        <p class="text-xs text-text-muted">
          Te faltan <span class="text-text font-medium">{{ summary.remainingHours }}h</span>
        </p>
      </div>

      <!-- Semanas -->
      <div class="bg-surface border border-border rounded-lg p-4 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-text-secondary">Semanas de trabajo</span>
          <span class="text-sm font-semibold text-text">{{ summary.completedWeeks }} / {{ summary.totalWeeks }}</span>
        </div>
        <div class="h-2 bg-overlay rounded-full overflow-hidden">
          <div class="h-full bg-accent rounded-full transition-all" :style="{ width: weeksProgress + '%' }"></div>
        </div>
        <p class="text-xs text-text-muted">
          Te faltan <span class="text-text font-medium">{{ summary.remainingWeeks }} semanas</span>
        </p>
      </div>

      <!-- Fechas fin -->
      <div v-if="summary.targetEndDate || summary.estimatedEndDate || summary.pace.daysPerWeek > 0" class="bg-surface border border-border rounded-lg p-4 space-y-1">
        <h3 class="text-sm font-semibold text-text mb-2">Fechas de fin</h3>
        <div class="flex flex-wrap gap-4">
          <div v-if="summary.targetEndDate" class="space-y-0.5">
            <p class="text-xs text-text-muted">Fin estimado al inicio</p>
            <p class="text-sm font-semibold text-text">{{ summary.targetEndDate }}</p>
          </div>
          <div v-if="summary.estimatedEndDate" class="space-y-0.5">
            <p class="text-xs text-text-muted">Fin estimado al ritmo actual</p>
            <p class="text-sm font-semibold text-text">{{ summary.estimatedEndDate }}</p>
          </div>
          <div v-if="summary.pace.daysPerWeek > 0" class="space-y-0.5">
            <p class="text-xs text-text-muted">Ritmo actual</p>
            <p class="text-sm font-semibold text-text">
              ~{{ summary.pace.daysPerWeek }} días / ~{{ summary.pace.hoursPerWeek }}h por semana
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Gráficas: heatmap + modalidad -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      <AttendanceCharts />
      <div class="flex flex-col gap-4">
        <AttendanceModeBar :summary="summary" />
        <!-- Presencial / Remoto -->
        <div v-if="summary" class="flex-1 bg-surface border border-border rounded-lg p-4 space-y-2">
          <span class="text-sm font-medium text-text-secondary">Modalidad en números</span>
          <div class="flex flex-wrap gap-3">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-accent"></span>
              <span class="text-xs text-text-muted">Presencial</span>
              <span class="text-sm font-semibold text-text">{{ summary.onSiteDays }} días</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-warning"></span>
              <span class="text-xs text-text-muted">Remoto</span>
              <span class="text-sm font-semibold text-text">{{ summary.remoteDays }} días</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-text-muted">Total</span>
              <span class="text-sm font-semibold text-text">{{ summary.completedDays }} días</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Registro -->
    <div data-tour="attendance-register" class="bg-surface border border-border rounded-lg p-4 space-y-4">      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-text">Registrar asistencia</h2>
      </div>

      <div class="space-y-1.5">
        <label for="attendance-date" class="block text-xs font-medium text-text-secondary">Fecha</label>
        <input
          id="attendance-date"
          v-model="selectedDate"
          type="date"
          :max="todayInMexicoCity()"
          class="w-full sm:w-auto bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs font-medium text-text-secondary">Modalidad</label>
        <div class="flex gap-2">
          <button
            @click="attendanceMode = 'on_site'"
            :class="attendanceMode === 'on_site' ? 'bg-accent text-white' : 'bg-overlay text-text-secondary hover:text-text'"
            class="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Presencial
          </button>
          <button
            @click="attendanceMode = 'remote'"
            :class="attendanceMode === 'remote' ? 'bg-accent text-white' : 'bg-overlay text-text-secondary hover:text-text'"
            class="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Remoto
          </button>
        </div>
      </div>

      <div data-tour="attendance-mode" class="flex gap-2">
        <button
          @click="mode = 'full'"
          :class="mode === 'full' ? 'bg-accent text-white' : 'bg-overlay text-text-secondary hover:text-text'"
          class="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Día completo ({{ summary?.fullDayHours || 8 }}h)
        </button>
        <button
          @click="mode = 'partial'"
          :class="mode === 'partial' ? 'bg-accent text-white' : 'bg-overlay text-text-secondary hover:text-text'"
          class="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Parcial
        </button>
      </div>

      <div v-if="actionError" class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-3">
        {{ actionError }}
      </div>

      <!-- Full day -->
      <div v-if="mode === 'full'" class="space-y-3">
        <p class="text-sm text-text-secondary">
          Registra un día completo de {{ summary?.fullDayHours || 8 }} horas. Se contará automáticamente como 1 día y {{ summary?.fullDayHours || 8 }}h.
        </p>
        <button
          v-if="!fullDayDone"
          @click="handleFullDay"
          :disabled="actionLoading"
          class="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-md text-sm font-medium transition-colors"
        >
          {{ actionLoading ? 'Registrando...' : 'Registrar día completo' }}
        </button>
        <div v-else class="bg-success/10 border border-success/20 text-accent text-sm rounded-md p-3">
          Ya registraste el día completo de esta fecha ({{ selectedAtt?.hours }}h).
        </div>
      </div>

      <!-- Parcial -->
      <div v-else class="space-y-3">
        <p class="text-sm text-text-secondary">
          Indica cuántas horas trabajaste en la fecha seleccionada.
        </p>
        <div class="flex gap-2">
          <input
            v-model.number="partialHours"
            type="number"
            min="0.5"
            step="0.5"
            max="10"
            placeholder="Ej. 4.5"
            class="flex-1 bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <button
            @click="handlePartial"
            :disabled="actionLoading || !partialHours"
            class="bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {{ actionLoading ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
        <p class="text-xs text-text-muted">Máximo 10h por día. Puedes usar decimales (ej. 4.5h).</p>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <label for="partial-start-time" class="block text-xs font-medium text-text-secondary">
              Hora de entrada
            </label>
            <input
              id="partial-start-time"
              v-model="partialStartTime"
              type="time"
              class="w-full bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
          <div class="space-y-1.5">
            <label for="partial-end-time" class="block text-xs font-medium text-text-secondary">
              Hora de salida
            </label>
            <input
              id="partial-end-time"
              v-model="partialEndTime"
              type="time"
              @change="endTimeTouched = true"
              class="w-full bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>
        <p class="text-xs text-text-muted">
          Se calcula automáticamente: salida = entrada + horas. Puedes ajustarla manualmente.
        </p>
        <div v-if="partialDone" class="bg-success/10 border border-success/20 text-accent text-sm rounded-md p-3">
          Ya registraste {{ selectedAtt?.hours }}h parciales para esta fecha.
        </div>
      </div>
    </div>

    <!-- Lista reciente -->
    <div data-tour="attendance-history" class="space-y-3">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h2 class="text-sm font-semibold text-text">Historial</h2>
        <div class="flex flex-wrap items-center gap-2">
          <select
            v-model="filterMonth"
            class="flex-1 min-w-[6.5rem] sm:flex-none sm:min-w-0 bg-overlay border border-border rounded-md px-2 py-1.5 text-xs text-text focus:outline-none focus:border-accent"
          >
            <option value="all">Todos los meses</option>
            <option v-for="[value, label] in availableMonths" :key="value" :value="value">
              {{ label }}
            </option>
          </select>
          <select
            v-model="filterType"
            class="flex-1 min-w-[6.5rem] sm:flex-none sm:min-w-0 bg-overlay border border-border rounded-md px-2 py-1.5 text-xs text-text focus:outline-none focus:border-accent"
          >
            <option value="all">Todos los tipos</option>
            <option value="full">Día completo</option>
            <option value="partial">Parcial</option>
          </select>
          <select
            v-model="filterMode"
            class="flex-1 min-w-[6.5rem] sm:flex-none sm:min-w-0 bg-overlay border border-border rounded-md px-2 py-1.5 text-xs text-text focus:outline-none focus:border-accent"
          >
            <option value="all">Toda modalidad</option>
            <option value="on_site">Presencial</option>
            <option value="remote">Remoto</option>
          </select>
        </div>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-xs text-text-muted">{{ filteredAttendances.length }} registros</span>
        <div class="flex items-center gap-1 bg-overlay border border-border rounded-md p-0.5">
          <button
            @click="historyView = 'list'"
            class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
            :class="historyView === 'list' ? 'bg-accent text-white' : 'text-text-muted hover:text-text'"
          >
            Lista
          </button>
          <button
            @click="historyView = 'calendar'"
            class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
            :class="historyView === 'calendar' ? 'bg-accent text-white' : 'text-text-muted hover:text-text'"
          >
            Calendario
          </button>
        </div>
      </div>

      <AttendanceCalendar
        v-if="historyView === 'calendar'"
        :attendances="filteredAttendances"
        :settings="settings"
        :summary="summary"
        compact
      />

      <template v-if="historyView === 'list'">
      <div v-if="loading" class="text-sm text-text-muted">Cargando...</div>
      <div v-else-if="filteredAttendances.length === 0" class="text-sm text-text-muted">
        No hay asistencias registradas.
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="a in filteredAttendances.slice(0, 30)"
          :key="a.id"
          class="bg-surface border border-border rounded-lg p-3"
        >
          <!-- Vista normal -->
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <p class="text-sm font-medium text-text">{{ formatDateShort(a.date) }}</p>
                <span v-if="weekForDate(a.date)" class="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded">Semana {{ weekForDate(a.date) }}</span>
              </div>
              <p class="text-xs text-text-muted">
                <span v-if="a.isFullDay" class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent mr-1">Completo</span>
                <span v-else class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-overlay text-text-secondary mr-1">Parcial</span>
                <span
                  v-if="a.mode === 'on_site'"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent mr-1"
                >
                  Presencial
                </span>
                <span
                  v-else-if="a.mode === 'remote'"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-warning/10 text-warning mr-1"
                >
                  Remoto
                </span>
                <span v-if="a.checkIn && a.checkOut">Entrada {{ formatTime(a.checkIn) }} · Salida {{ formatTime(a.checkOut) }}</span>
                <span v-else-if="!a.isFullDay && a.hours > 0">{{ a.hours }}h registradas</span>
                <span v-else-if="!a.checkIn && !a.checkOut">Sin registro de hora</span>
              </p>
            </div>
            <div class="text-right flex items-center gap-3">
              <p class="text-sm font-semibold text-text">{{ a.hours }}h</p>
              <div class="flex gap-1">
                <button
                  @click="startEdit(a)"
                  class="text-text-muted hover:text-accent transition-colors p-1 rounded hover:bg-hover"
                  title="Editar"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click="openDelete(a)"
                  class="text-text-muted hover:text-error transition-colors p-1 rounded hover:bg-hover"
                  title="Eliminar"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
      </template>
    </div>

    <!-- Modal de confirmación para eliminar -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="deleteId !== null"
          class="fixed inset-0 z-[70] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          @click="closeDelete"
        >
          <div
            class="bg-canvas border border-border rounded-lg w-full max-w-sm shadow-2xl p-6 space-y-4"
            @click.stop
          >
            <h3 class="text-lg font-semibold text-text">Eliminar asistencia</h3>
            <p class="text-sm text-text-secondary">
              Para confirmar la eliminación, escribe el día de hoy:
              <span class="text-text font-medium">{{ currentDayName }}</span>
            </p>
            <input
              v-model="deleteConfirmText"
              type="text"
              placeholder="Escribe el día..."
              class="w-full bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <div v-if="deleteError" class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-3">
              {{ deleteError }}
            </div>
            <div class="flex gap-2">
              <button
                @click="closeDelete"
                class="flex-1 bg-overlay hover:bg-hover text-text-secondary hover:text-text px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                @click="handleDelete"
                :disabled="deleteLoading || !canDelete"
                class="flex-1 bg-error hover:bg-error-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {{ deleteLoading ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal de datos faltantes para exportar -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="exportConfirmOpen"
          class="fixed inset-0 z-[70] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          @click="closeExportConfirm"
        >
          <div
            class="bg-canvas border border-border rounded-lg w-full max-w-sm shadow-2xl p-6 space-y-4"
            @click.stop
          >
            <h3 class="text-lg font-semibold text-text">Faltan datos para el reporte</h3>
            <p class="text-sm text-text-secondary">
              Te faltan por completar en <span class="text-text font-medium">Ajustes</span>:
            </p>
            <ul class="text-sm text-text space-y-1">
              <li v-for="item in missingData" :key="item" class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-warning shrink-0"></span>
                {{ item }}
              </li>
            </ul>
            <p class="text-xs text-text-muted">
              Puedes exportar igualmente y completar los datos a mano, o llenarlos ahora.
            </p>
            <div class="flex flex-col sm:flex-row gap-2">
              <button
                @click="closeExportConfirm"
                class="flex-1 bg-overlay hover:bg-hover text-text-secondary hover:text-text px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                @click="exportAnyway"
                class="flex-1 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Exportar igualmente
              </button>
              <button
                @click="completeExportData"
                class="flex-1 bg-warning/15 hover:bg-warning/25 text-warning px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Completar datos
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <AttendanceEditModal
      :is-open="editModalOpen"
      :attendance="editTarget"
      @close="closeEditModal"
      @saved="handleEditSaved"
    />

    <FeatureTour :steps="tourSteps" storage-key="tour:attendance" />
    <AttendanceExportNoticeModal :enabled="canExport" />
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
