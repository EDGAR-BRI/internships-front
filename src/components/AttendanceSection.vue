<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAttendances } from '../composables/useAttendances'
import { useSettings } from '../composables/useSettings'
import { computeWeek } from '../utils/week'

const {
  attendances,
  summary,
  loading,
  error,
  fetchAttendances,
  fetchSummary,
  registerFullDay,
  registerPartial,
  updateAttendance,
  deleteAttendance,
  attendanceForDate,
} = useAttendances()

const { settings, fetchSettings } = useSettings()

function openSettingsModal() {
  window.dispatchEvent(new CustomEvent('open-settings-modal'))
}

const mode = ref<'full' | 'partial'>('full')
const selectedDate = ref(todayInMexicoCity())
const partialHours = ref<number | ''>('')
const actionLoading = ref(false)
const actionError = ref('')

const editingId = ref<number | null>(null)
const editIsFullDay = ref(false)
const editHours = ref<number | ''>('')
const editLoading = ref(false)
const editError = ref('')

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
  } else {
    partialHours.value = summary.value?.fullDayHours || settings.value?.workHoursPerDay || 8
  }
})

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

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City',
  })
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Mexico_City',
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
  return new Date(iso).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Mexico_City',
  })
}

function startEdit(a: typeof attendances.value[0]) {
  editingId.value = a.id
  editIsFullDay.value = !!a.isFullDay
  editHours.value = a.isFullDay ? '' : a.hours
  editError.value = ''
}

function cancelEdit() {
  editingId.value = null
  editError.value = ''
}

async function handleEditSave(a: typeof attendances.value[0]) {
  editLoading.value = true
  editError.value = ''
  try {
    if (editIsFullDay.value) {
      await updateAttendance(a.id, { isFullDay: true })
    } else {
      const hours = Number(editHours.value)
      if (!hours || hours <= 0) {
        editError.value = 'Ingresa una cantidad válida de horas'
        return
      }
      await updateAttendance(a.id, { isFullDay: false, hours })
    }
    editingId.value = null
    await fetchSummary()
  } catch (e: any) {
    editError.value = e.message || 'Error al guardar'
  } finally {
    editLoading.value = false
  }
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
    if (!hours || hours <= 0) {
      actionError.value = 'Ingresa una cantidad válida de horas'
      return
    }
    await registerPartial(selectedDate.value, hours)
    partialHours.value = ''
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
    await registerFullDay(selectedDate.value)
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
      <div v-if="currentWeek" class="text-right">
        <p class="text-xs text-text-muted">Semana de pasantía</p>
        <p class="text-lg font-bold text-accent">{{ currentWeek }}</p>
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
          <p class="text-xs text-text-muted">Semanas omitidas</p>
          <p class="text-text font-medium">{{ settings.skippedWeeks?.join(', ') || 'Ninguna' }}</p>
        </div>
      </div>
    </div>

    <div v-if="!hasSettings && !loading" class="bg-warning/10 border border-warning/20 text-warning text-sm rounded-md p-3">
      No tienes configurado el período de pasantía.
      <a href="/ajustes" class="underline font-medium">Configúralo aquí</a>
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

      <!-- Fechas fin -->
      <div class="bg-surface border border-border rounded-lg p-4 space-y-1 sm:col-span-2">
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

    <!-- Registro -->
    <div class="bg-surface border border-border rounded-lg p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-text">Registrar asistencia</h2>
      </div>

      <div class="space-y-1.5">
        <label for="attendance-date" class="block text-xs font-medium text-text-secondary">Fecha</label>
        <input
          id="attendance-date"
          v-model="selectedDate"
          type="date"
          class="w-full sm:w-auto bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>

      <div class="flex gap-2">
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
            min="1"
            :max="summary?.fullDayHours || 24"
            placeholder="Ej. 4"
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
        <p class="text-xs text-text-muted">Máximo {{ summary?.fullDayHours || 8 }}h (tu jornada configurada).</p>
        <div v-if="partialDone" class="bg-success/10 border border-success/20 text-accent text-sm rounded-md p-3">
          Ya registraste {{ selectedAtt?.hours }}h parciales para esta fecha.
        </div>
      </div>
    </div>

    <!-- Lista reciente -->
    <div class="space-y-3">
      <h2 class="text-sm font-semibold text-text">Historial reciente</h2>
      <div v-if="loading" class="text-sm text-text-muted">Cargando...</div>
      <div v-else-if="attendances.length === 0" class="text-sm text-text-muted">
        No hay asistencias registradas.
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="a in attendances.slice(0, 30)"
          :key="a.id"
          class="bg-surface border border-border rounded-lg p-3"
        >
          <!-- Vista normal -->
          <div v-if="editingId !== a.id" class="flex items-center justify-between">
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <p class="text-sm font-medium text-text">{{ formatDateShort(a.date) }}</p>
                <span v-if="weekForDate(a.date)" class="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded">Semana {{ weekForDate(a.date) }}</span>
              </div>
              <p class="text-xs text-text-muted">
                <span v-if="a.isFullDay" class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent mr-1">Completo</span>
                <span v-else class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-overlay text-text-secondary mr-1">Parcial</span>
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

          <!-- Vista edición inline -->
          <div v-else class="space-y-3">
            <div v-if="editError" class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-3">
              {{ editError }}
            </div>
            <div class="flex gap-2">
              <button
                @click="editIsFullDay = true"
                :class="editIsFullDay ? 'bg-accent text-white' : 'bg-overlay text-text-secondary hover:text-text'"
                class="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Día completo
              </button>
              <button
                @click="editIsFullDay = false"
                :class="!editIsFullDay ? 'bg-accent text-white' : 'bg-overlay text-text-secondary hover:text-text'"
                class="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Parcial
              </button>
            </div>
            <div v-if="!editIsFullDay" class="flex gap-2">
              <input
                v-model.number="editHours"
                type="number"
                min="1"
                :max="summary?.fullDayHours || 24"
                placeholder="Horas"
                class="flex-1 bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div class="flex gap-2">
              <button
                @click="handleEditSave(a)"
                :disabled="editLoading"
                class="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {{ editLoading ? 'Guardando...' : 'Guardar' }}
              </button>
              <button
                @click="cancelEdit"
                class="flex-1 bg-overlay hover:bg-hover text-text-secondary hover:text-text px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
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
