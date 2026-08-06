<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useLogEntries } from '../composables/useLogEntries'
import { useNotes } from '../composables/useNotes'
import { useAttendances } from '../composables/useAttendances'
import LogEntryList from './LogEntryList.vue'
import NotesList from './NotesList.vue'
import AttendanceCharts from './AttendanceCharts.vue'
import AttendanceModeBar from './AttendanceModeBar.vue'

const { logEntries } = useLogEntries()
const { notes } = useNotes()
const { summary, fetchSummary } = useAttendances()

onMounted(() => {
  fetchSummary()
  window.addEventListener('settings-saved', fetchSummary)
})

onUnmounted(() => {
  window.removeEventListener('settings-saved', fetchSummary)
})

const daysProgress = computed(() => {
  if (!summary.value?.totalDays) return 0
  return Math.min((summary.value.completedDays / summary.value.totalDays) * 100, 100)
})

const hoursProgress = computed(() => {
  if (!summary.value?.totalHours) return 0
  return Math.min((summary.value.completedHours / summary.value.totalHours) * 100, 100)
})

const weeksProgress = computed(() => {
  if (!summary.value?.totalWeeks) return 0
  return Math.min((summary.value.completedWeeks / summary.value.totalWeeks) * 100, 100)
})

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const parts = iso.slice(0, 10).split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => isNaN(n))) return iso
  const [y, m, d] = parts
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

const stats = computed(() => {
  const entries = logEntries.value
  const allNotes = notes.value
  return {
    totalActivities: entries.length,
    pending: entries.filter((e) => e.status === 'pending').length,
    inProgress: entries.filter((e) => e.status === 'in_progress').length,
    done: entries.filter((e) => e.status === 'done').length,
    totalNotes: allNotes.length,
  }
})

const statCards = computed(() => [
  { label: 'Actividades', value: stats.value.totalActivities, color: 'text-text' },
  { label: 'Pendientes', value: stats.value.pending, color: 'text-neutral-400' },
  { label: 'En curso', value: stats.value.inProgress, color: 'text-warning' },
  { label: 'Terminadas', value: stats.value.done, color: 'text-accent' },
  { label: 'Notas', value: stats.value.totalNotes, color: 'text-text' },
])
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Resumen</h1>
        <p class="text-text-muted text-sm mt-1">Vista general de tu progreso</p>
      </div>
      <a
        href="/bitacora"
        class="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 flex items-center justify-center gap-2 w-full sm:w-auto"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        Ir a bitácora
      </a>
    </div>

    <!-- Progreso de pasantía -->
    <div class="bg-surface border border-border rounded-xl p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-text">Progreso de tu pasantía</h2>
        <a href="/asistencia" class="text-xs text-accent hover:text-accent-hover hover:underline transition-colors">
          Ir a asistencia →
        </a>
      </div>

      <div v-if="!summary" class="text-sm text-text-muted">Cargando progreso...</div>

      <div v-else-if="!summary.targetEndDate" class="text-sm text-text-muted">
        Aún no tienes configurado el período de tu pasantía.
        <a href="/asistencia" class="text-accent underline font-medium">Configúralo aquí</a>
        para ver cuánto llevas y cuánto te falta.
      </div>

      <template v-else>
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text-secondary">Días</span>
            <span class="text-sm font-semibold text-text">
              Llevas {{ summary.completedDays }} de {{ summary.totalDays }}
              <span class="text-text-muted font-normal">· te faltan {{ summary.remainingDays }}</span>
            </span>
          </div>
          <div class="h-2 bg-overlay rounded-full overflow-hidden">
            <div class="h-full bg-accent rounded-full transition-all" :style="{ width: daysProgress + '%' }"></div>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text-secondary">Horas</span>
            <span class="text-sm font-semibold text-text">
              Llevas {{ summary.completedHours }}h de {{ summary.totalHours }}h
              <span class="text-text-muted font-normal">· te faltan {{ summary.remainingHours }}h</span>
            </span>
          </div>
          <div class="h-2 bg-overlay rounded-full overflow-hidden">
            <div class="h-full bg-accent rounded-full transition-all" :style="{ width: hoursProgress + '%' }"></div>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text-secondary">Semanas</span>
            <span class="text-sm font-semibold text-text">
              Llevas {{ summary.completedWeeks }} de {{ summary.totalWeeks }}
              <span class="text-text-muted font-normal">· te faltan {{ summary.remainingWeeks }}</span>
            </span>
          </div>
          <div class="h-2 bg-overlay rounded-full overflow-hidden">
            <div class="h-full bg-accent rounded-full transition-all" :style="{ width: weeksProgress + '%' }"></div>
          </div>
        </div>
      </template>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <div
        v-for="card in statCards"
        :key="card.label"
        class="bg-surface border border-border rounded-xl p-4 flex flex-col items-start"
      >
        <span class="text-[11px] font-medium text-text-muted uppercase tracking-wider">{{ card.label }}</span>
        <span class="text-2xl font-bold mt-1" :class="card.color">{{ card.value }}</span>
      </div>
    </div>

    <!-- Días activos + modalidad -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      <AttendanceCharts compact />
      <div class="flex flex-col gap-4">
        <AttendanceModeBar :summary="summary" />
        <div v-if="summary?.targetEndDate || summary?.estimatedEndDate || (summary?.pace?.daysPerWeek ?? 0) > 0" class="flex-1 bg-surface border border-border rounded-xl p-4 space-y-1">
          <h2 class="text-sm font-semibold text-text mb-2">Fechas de fin</h2>
          <div class="flex flex-wrap gap-4">
            <div v-if="summary.targetEndDate" class="space-y-0.5">
              <p class="text-xs text-text-muted">Fin estimado al inicio</p>
              <p class="text-sm font-semibold text-text">{{ formatDate(summary.targetEndDate) }}</p>
            </div>
            <div v-if="summary.estimatedEndDate" class="space-y-0.5">
              <p class="text-xs text-text-muted">Fin estimado al ritmo actual</p>
              <p class="text-sm font-semibold text-text">{{ formatDate(summary.estimatedEndDate) }}</p>
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
    </div>

    <!-- Recent Activities -->
    <div>
      <LogEntryList
        title="Actividades recientes"
        :limit="5"
        :enable-search="false"
        :enable-date-filter="false"
        :enable-view-toggle="false"
      />
      <div class="mt-3 text-right">
        <a href="/bitacora?tab=activities" class="text-sm text-accent hover:text-accent-hover transition-colors inline-flex items-center gap-1">
          Ver todas las actividades
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>
    </div>

    <!-- Recent Notes -->
    <div>
      <NotesList
        title="Notas recientes"
        mode="all"
        :limit="5"
        :enable-search="false"
        :enable-date-filter="false"
      />
      <div class="mt-3 text-right">
        <a href="/bitacora?tab=notes" class="text-sm text-accent hover:text-accent-hover transition-colors inline-flex items-center gap-1">
          Ver todas las notas
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>
    </div>
  </div>
</template>
