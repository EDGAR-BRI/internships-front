<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Attendance, AttendanceSummary } from '../composables/useAttendances'
import type { UserSettings } from '../composables/useSettings'

const props = defineProps<{
  attendances: Attendance[]
  settings: UserSettings | null
  summary: AttendanceSummary | null
}>()

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

const viewDate = ref({
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
})

function formatYmd(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const todayYmd = computed(() => {
  const now = new Date()
  return formatYmd(now.getFullYear(), now.getMonth(), now.getDate())
})

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
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(formatYmd(year, month, d))
  }
  return cells
})

const attByDate = computed(() => {
  const map = new Map<string, Attendance>()
  for (const a of props.attendances) {
    map.set(a.date.slice(0, 10), a)
  }
  return map
})

function markerFor(date: string) {
  const s = props.settings
  const sum = props.summary
  return {
    attendance: attByDate.value.get(date),
    isStart: s?.startDate.slice(0, 10) === date,
    isTarget: sum?.targetEndDate === date,
    isEstimated: sum?.estimatedEndDate === date,
    isEnd: s?.endDate.slice(0, 10) === date,
  }
}

const cells = computed(() =>
  days.value.map((date) => ({
    date,
    marker: date ? markerFor(date) : null,
  }))
)

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
</script>

<template>
  <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold text-text capitalize">{{ monthLabel }}</h2>
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
      <div
        v-for="(cell, i) in cells"
        :key="i"
        class="aspect-square flex flex-col items-center justify-center rounded-md text-xs relative"
        :class="cell.marker?.attendance ? 'bg-accent/15' : ''"
      >
        <template v-if="cell.date && cell.marker">
          <span
            class="w-7 h-7 flex items-center justify-center rounded-md font-medium"
            :class="[
              cell.marker.attendance ? 'bg-accent text-white' : 'text-text-secondary',
              cell.date === todayYmd ? 'ring-1 ring-accent' : '',
            ]"
          >
            {{ dayNumber(cell.date) }}
          </span>
          <span class="flex gap-0.5 mt-0.5 h-1.5 items-center">
            <span v-if="cell.marker.isStart" class="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Inicio"></span>
            <span v-if="cell.marker.isTarget" class="w-1.5 h-1.5 rounded-full bg-sky-400" title="Fin estimado"></span>
            <span v-if="cell.marker.isEstimated" class="w-1.5 h-1.5 rounded-full bg-warning" title="Fin al ritmo actual"></span>
            <span v-if="cell.marker.isEnd" class="w-1.5 h-1.5 rounded-full bg-error" title="Fin configurado"></span>
          </span>
        </template>
      </div>
    </div>

    <div class="flex flex-wrap gap-x-4 gap-y-1.5 pt-2 border-t border-border text-[11px] text-text-muted">
      <span class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-sm bg-accent"></span>
        Asistencia
      </span>
      <span class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-sm bg-emerald-500"></span>
        Inicio
      </span>
      <span class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-sm bg-sky-400"></span>
        Fin estimado
      </span>
      <span class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-sm bg-warning"></span>
        Fin al ritmo actual
      </span>
      <span class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-sm bg-error"></span>
        Fin configurado
      </span>
    </div>
  </div>
</template>
