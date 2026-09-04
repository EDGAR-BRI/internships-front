<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAttendances, type Attendance } from '../composables/useAttendances'

const props = withDefaults(
  defineProps<{
    open: boolean
    attendances: Attendance[]
    defaultHours?: number
  }>(),
  { defaultHours: 8 }
)

const emit = defineEmits<{
  close: []
  saved: [result: { created: number; skipped: number }]
}>()

const { bulkRegister } = useAttendances()

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

const selectedDates = ref<string[]>([])
const type = ref<'full' | 'partial'>('full')
const hours = ref<number | ''>(props.defaultHours)
const checkIn = ref('')
const checkOut = ref('')
const attendanceMode = ref<'on_site' | 'remote'>('on_site')
const rangeStart = ref('')
const rangeEnd = ref('')
const saving = ref(false)
const error = ref('')
const success = ref<{ created: number; skipped: number } | null>(null)

const viewDate = ref({
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
})

function todayInMexicoCity(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

const todayYmd = todayInMexicoCity()

function formatYmd(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function addHoursToTime(time: string, h: number): string {
  const [hh, mm] = time.split(':').map(Number)
  if (isNaN(hh) || isNaN(mm)) return ''
  const total = (hh * 60 + mm + h * 60) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

const registeredDates = computed(() => new Set(props.attendances.map((a) => a.date.slice(0, 10))))

const monthLabel = computed(() =>
  new Date(viewDate.value.year, viewDate.value.month, 1).toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  })
)

const days = computed<(string | null)[]>(() => {
  const { year, month } = viewDate.value
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(formatYmd(year, month, d))
  return cells
})

function dayState(date: string): 'selectable' | 'selected' | 'registered' | 'future' {
  if (registeredDates.value.has(date)) return 'registered'
  if (date > todayYmd) return 'future'
  return selectedDates.value.includes(date) ? 'selected' : 'selectable'
}

function toggleDay(date: string) {
  const state = dayState(date)
  if (state === 'selected') {
    selectedDates.value = selectedDates.value.filter((d) => d !== date)
  } else if (state === 'selectable') {
    selectedDates.value = [...selectedDates.value, date]
  }
}

function eachDay(start: string, end: string): string[] {
  const result: string[] = []
  const s = new Date(`${start}T00:00:00`)
  const e = new Date(`${end}T00:00:00`)
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    result.push(formatYmd(d.getFullYear(), d.getMonth(), d.getDate()))
  }
  return result
}

function applyRange() {
  if (!rangeStart.value || !rangeEnd.value) return
  if (rangeStart.value > rangeEnd.value) {
    error.value = 'La fecha de inicio no puede ser posterior a la de fin'
    return
  }
  error.value = ''
  const candidates = eachDay(rangeStart.value, rangeEnd.value).filter(
    (d) => dayState(d) === 'selectable'
  )
  selectedDates.value = Array.from(new Set([...selectedDates.value, ...candidates]))
}

function clearSelection() {
  selectedDates.value = []
  error.value = ''
}

function prevMonth() {
  let { year, month } = viewDate.value
  month--
  if (month < 0) {
    month = 11
    year--
  }
  viewDate.value = { year, month }
}

function nextMonth() {
  let { year, month } = viewDate.value
  month++
  if (month > 11) {
    month = 0
    year++
  }
  viewDate.value = { year, month }
}

function dayNumber(date: string): number {
  return Number(date.slice(8, 10))
}

function shortDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function removeDate(date: string) {
  selectedDates.value = selectedDates.value.filter((d) => d !== date)
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      selectedDates.value = []
      type.value = 'full'
      hours.value = props.defaultHours
      checkIn.value = ''
      checkOut.value = ''
      attendanceMode.value = 'on_site'
      rangeStart.value = ''
      rangeEnd.value = ''
      error.value = ''
      success.value = null
      const now = new Date()
      viewDate.value = { year: now.getFullYear(), month: now.getMonth() }
    }
  }
)

async function handleSave() {
  if (selectedDates.value.length === 0) {
    error.value = 'Selecciona al menos un día en el calendario'
    return
  }
  if (type.value === 'partial') {
    const hrs = Number(hours.value)
    if (!hrs || hrs <= 0 || hrs > 10) {
      error.value = 'Ingresa una cantidad válida de horas (máximo 10h)'
      return
    }
  }
  saving.value = true
  error.value = ''
  try {
    const payload: {
      dates: string[]
      isFullDay?: boolean
      hours?: number
      mode?: Attendance['mode']
      checkIn?: string
      checkOut?: string
    } = {
      dates: [...selectedDates.value].sort(),
      mode: attendanceMode.value,
    }
    if (type.value === 'full') {
      payload.isFullDay = true
    } else {
      payload.hours = Number(hours.value)
      if (checkIn.value) payload.checkIn = checkIn.value
      if (checkOut.value) payload.checkOut = checkOut.value
    }
    const result = await bulkRegister(payload)
    success.value = result
    emit('saved', result)
  } catch (e: any) {
    error.value = e.message || 'Error al registrar asistencias'
  } finally {
    saving.value = false
  }
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[70] overflow-y-auto bg-black/60 backdrop-blur-sm"
      @click="handleBackdropClick"
      @keydown="handleKeydown"
    >
      <div class="min-h-full flex items-center justify-center p-4 sm:p-6">
        <div
          class="bg-canvas border border-border rounded-lg w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto"
          @click.stop
        >
          <div class="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <h2 class="text-lg font-semibold text-text">Carga masiva de asistencia</h2>
            <button
              @click="emit('close')"
              class="text-text-muted hover:text-text transition-colors p-1.5 rounded-md hover:bg-hover"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="overflow-y-auto p-4 sm:p-6 space-y-4">
            <div v-if="error" class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-3">
              {{ error }}
            </div>

            <div
              v-if="success"
              class="bg-success/10 border border-success/20 text-accent text-sm rounded-md p-3"
            >
              Se registraron {{ success.created }} día(s)
              <template v-if="success.skipped > 0">({{ success.skipped }} ya existían y se omitieron)</template>.
              Puedes seleccionar más días o cerrar.
            </div>

            <!-- Rango de fechas -->
            <div class="bg-surface border border-border rounded-lg p-3 space-y-2">
              <p class="text-xs font-semibold text-text">Seleccionar por rango de fechas</p>
              <div class="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <input
                  v-model="rangeStart"
                  type="date"
                  :max="todayYmd"
                  class="flex-1 bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
                <span class="text-text-muted text-sm text-center">a</span>
                <input
                  v-model="rangeEnd"
                  type="date"
                  :max="todayYmd"
                  class="flex-1 bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
                <button
                  @click="applyRange"
                  class="bg-overlay hover:bg-hover text-text-secondary hover:text-text px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Aplicar rango
                </button>
              </div>
              <p class="text-xs text-text-muted">
                Se marcarán todos los días del rango. Toca un día en el calendario para quitarlo o añadirlo.
              </p>
            </div>

            <!-- Calendario -->
            <div class="bg-surface border border-border rounded-lg p-3 space-y-3">
              <div class="flex items-center justify-between">
                <p class="text-sm font-semibold text-text capitalize">{{ monthLabel }}</p>
                <div class="flex items-center gap-1">
                  <button
                    @click="prevMonth"
                    class="p-1.5 text-text-muted hover:text-text hover:bg-overlay rounded-md transition-colors"
                    title="Mes anterior"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    @click="nextMonth"
                    class="p-1.5 text-text-muted hover:text-text hover:bg-overlay rounded-md transition-colors"
                    title="Mes siguiente"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-7 gap-1 text-center">
                <div
                  v-for="wd in WEEKDAYS"
                  :key="wd"
                  class="text-[10px] font-medium text-text-muted py-1"
                >
                  {{ wd }}
                </div>
              </div>

              <div class="grid grid-cols-7 gap-1">
                <button
                  v-for="(date, i) in days"
                  :key="i"
                  :disabled="!date || dayState(date) === 'future' || dayState(date) === 'registered'"
                  @click="date && toggleDay(date)"
                  class="aspect-square flex items-center justify-center rounded-md text-xs font-medium transition-colors"
                  :class="[
                    !date ? 'pointer-events-none' : '',
                    dayState(date) === 'selected'
                      ? 'bg-accent text-white'
                      : dayState(date) === 'registered'
                        ? 'bg-accent/15 text-text-muted cursor-not-allowed'
                        : dayState(date) === 'future'
                          ? 'text-text-disabled cursor-not-allowed'
                          : 'bg-overlay text-text-secondary hover:bg-hover hover:text-text cursor-pointer',
                    date === todayYmd ? 'ring-1 ring-accent' : '',
                  ]"
                  :title="
                    dayState(date) === 'registered'
                      ? 'Ya registrado'
                      : dayState(date) === 'future'
                        ? 'Fecha futura'
                        : dayState(date) === 'selected'
                          ? 'Toca para deseleccionar'
                          : 'Toca para seleccionar'
                  "
                >
                  <template v-if="date">
                    {{ dayNumber(date) }}
                  </template>
                </button>
              </div>

              <div class="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-text-muted">
                <span class="flex items-center gap-1.5">
                  <span class="w-3 h-3 rounded-sm bg-accent"></span>
                  Seleccionado
                </span>
                <span class="flex items-center gap-1.5">
                  <span class="w-3 h-3 rounded-sm bg-accent/15 border border-border"></span>
                  Ya registrado
                </span>
                <span class="flex items-center gap-1.5">
                  <span class="w-3 h-3 rounded-sm bg-overlay border border-border"></span>
                  Disponible
                </span>
              </div>
            </div>

            <!-- Días seleccionados -->
            <div v-if="selectedDates.length > 0" class="space-y-2">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold text-text">
                  {{ selectedDates.length }} día(s) seleccionado(s)
                </p>
                <button @click="clearSelection" class="text-xs text-error hover:underline">
                  Limpiar selección
                </button>
              </div>
              <div class="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                <span
                  v-for="date in [...selectedDates].sort()"
                  :key="date"
                  class="inline-flex items-center gap-1 bg-accent/10 text-accent text-xs px-2 py-1 rounded-md"
                >
                  {{ shortDate(date) }}
                  <button
                    @click="removeDate(date)"
                    class="text-accent hover:text-text transition-colors"
                    title="Quitar"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              </div>
            </div>

            <!-- Tipo y modalidad -->
            <div class="space-y-1.5">
              <label class="block text-xs font-medium text-text-secondary">Tipo</label>
              <div class="flex gap-2">
                <button
                  @click="type = 'full'"
                  :class="type === 'full' ? 'bg-accent text-white' : 'bg-overlay text-text-secondary hover:text-text'"
                  class="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Día completo ({{ props.defaultHours }}h)
                </button>
                <button
                  @click="type = 'partial'"
                  :class="type === 'partial' ? 'bg-accent text-white' : 'bg-overlay text-text-secondary hover:text-text'"
                  class="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Parcial
                </button>
              </div>
            </div>

            <div v-if="type === 'partial'" class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label class="block text-xs font-medium text-text-secondary">Horas</label>
                <input
                  v-model.number="hours"
                  type="number"
                  min="0.5"
                  step="0.5"
                  max="10"
                  placeholder="Ej. 4.5"
                  class="w-full bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
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
            </div>

            <div v-if="type === 'partial'" class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label class="block text-xs font-medium text-text-secondary">Hora de entrada</label>
                <input
                  v-model="checkIn"
                  type="time"
                  class="w-full bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
              <div class="space-y-1.5">
                <label class="block text-xs font-medium text-text-secondary">Hora de salida</label>
                <input
                  v-model="checkOut"
                  type="time"
                  @change="checkOut = checkOut || addHoursToTime(checkIn, Number(hours) || 0)"
                  class="w-full bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <div v-if="type === 'full'" class="space-y-1.5">
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
          </div>

          <div class="flex gap-2 px-6 py-4 border-t border-border flex-shrink-0">
            <button
              @click="emit('close')"
              class="flex-1 bg-overlay hover:bg-hover text-text-secondary hover:text-text px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              @click="handleSave"
              :disabled="saving || selectedDates.length === 0"
              class="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {{ saving ? 'Guardando...' : `Guardar ${selectedDates.length || ''} día(s)` }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>