<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useAttendances } from '../composables/useAttendances'
import { useSettings } from '../composables/useSettings'
import AttendanceCalendar from './AttendanceCalendar.vue'

const props = withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const { attendances, summary, fetchAttendances, fetchSummary } = useAttendances()
const { settings, fetchSettings } = useSettings()

const viewMode = ref<'heatmap' | 'calendar'>('heatmap')

const heatmapRef = ref<HTMLDivElement | null>(null)
const containerW = ref(0)
let resizeObserver: ResizeObserver | null = null

function measure() {
  if (heatmapRef.value) containerW.value = heatmapRef.value.clientWidth
}

watch(
  () => viewMode.value,
  async () => {
    if (viewMode.value === 'heatmap') {
      await nextTick()
      measure()
    }
  }
)

onMounted(() => {
  fetchAttendances()
  fetchSummary()
  fetchSettings()
  resizeObserver = new ResizeObserver(measure)
  if (heatmapRef.value) resizeObserver.observe(heatmapRef.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

function computeWeekIndex(start: string, date: string): number | null {
  const s = new Date(start + 'T00:00:00')
  const d = new Date(date + 'T00:00:00')
  if (isNaN(s.getTime()) || isNaN(d.getTime()) || d < s) return null
  const diffDays = Math.floor((d.getTime() - s.getTime()) / 86400000)
  return Math.floor(diffDays / 7) + 1
}

const heatCells = computed(() => {
  if (!settings.value?.startDate) return []
  const start = settings.value.startDate.slice(0, 10)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  const dayMap = new Map<string, number>()
  for (const a of attendances.value) {
    const d = a.date.slice(0, 10)
    dayMap.set(d, (dayMap.get(d) || 0) + a.hours)
  }

  const cells: { week: number; day: number; date: string; hours: number; level: number }[] = []
  const startDate = new Date(start + 'T00:00:00')
  const endDate = new Date(today + 'T00:00:00')
  if (isNaN(startDate.getTime()) || startDate > endDate) return []

  // Extender hasta el final de la semana actual (domingo) para mostrar
  // los días restantes en gris, como GitHub
  const todayDayIndex = (endDate.getDay() + 6) % 7
  const daysUntilSunday = 6 - todayDayIndex
  if (daysUntilSunday > 0) {
    endDate.setDate(endDate.getDate() + daysUntilSunday)
  }

  const cur = new Date(startDate)
  let guard = 0
  while (cur <= endDate && guard < 1100) {
    guard++
    const date = iso(cur)
    const hours = dayMap.get(date) || 0
    const week = computeWeekIndex(start, date)
    if (week !== null) {
      const day = (cur.getDay() + 6) % 7
      const level = hours <= 0 ? 0 : hours <= 2 ? 1 : hours <= 4 ? 2 : hours <= 7 ? 3 : 4
      cells.push({ week, day, date, hours, level })
    }
    cur.setDate(cur.getDate() + 1)
  }
  return cells
})

const totalWeeks = computed(() => Math.max(1, ...heatCells.value.map((c) => c.week)))

const displayWeeks = computed(() => {
  const width = containerW.value
  if (!width) return totalWeeks.value
  const fits = Math.floor((width - LEFT_W - CELL_GAP) / (CELL + CELL_GAP))
  return Math.max(totalWeeks.value, fits)
})

const placeholderCells = computed(() => {
  const cells: { week: number; day: number }[] = []
  for (let w = totalWeeks.value + 1; w <= displayWeeks.value; w++) {
    for (let day = 0; day < 7; day++) {
      cells.push({ week: w, day })
    }
  }
  return cells
})

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const weekDates = computed(() => {
  if (!settings.value?.startDate) return []
  const start = settings.value.startDate.slice(0, 10)
  const startDate = new Date(start + 'T00:00:00')
  const list: { week: number; date: string }[] = []
  for (let w = 1; w <= displayWeeks.value; w++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + (w - 1) * 7)
    list.push({ week: w, date: iso(d) })
  }
  return list
})

const monthLabels = computed(() => {
  const list: { week: number; label: string }[] = []
  let lastMonth = -1
  for (const wd of weekDates.value) {
    const month = Number(wd.date.slice(5, 7))
    if (month !== lastMonth) {
      list.push({ week: wd.week, label: MONTH_LABELS[month - 1] })
      lastMonth = month
    }
  }
  return list
})

const dateStep = computed(() => Math.max(1, Math.ceil(displayWeeks.value / 10)))

const targetEndWeek = computed(() => {
  if (!settings.value?.startDate || !summary.value?.targetEndDate) return null
  return computeWeekIndex(settings.value.startDate.slice(0, 10), summary.value.targetEndDate)
})

const estimatedEndWeek = computed(() => {
  if (!settings.value?.startDate || !summary.value?.estimatedEndDate) return null
  return computeWeekIndex(settings.value.startDate.slice(0, 10), summary.value.estimatedEndDate)
})

function formatShortDate(isoDate: string): string {
  const [, m, d] = isoDate.split('-').map(Number)
  return `${d}/${m}`
}

function formatLongDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City',
  })
}

const CELL = 11
const CELL_GAP = 3
const LEFT_W = 20
const TOP_H = 20
const BOTTOM_H = 20
const fontS = 9

const heatH = computed(() => TOP_H + 7 * (CELL + CELL_GAP) + CELL_GAP)
const heatW = computed(() => LEFT_W + displayWeeks.value * (CELL + CELL_GAP) + CELL_GAP)

function cellX(week: number): number {
  return LEFT_W + CELL_GAP + (week - 1) * (CELL + CELL_GAP)
}

function cellY(day: number): number {
  return TOP_H + CELL_GAP + day * (CELL + CELL_GAP)
}

const HEAT_COLORS = [
  'var(--color-overlay)',
  'rgba(0, 112, 243, 0.22)',
  'rgba(0, 112, 243, 0.45)',
  'rgba(0, 112, 243, 0.7)',
  '#0070f3',
]
</script>

<template>
  <div class="grid grid-cols-1 gap-4">
    <!-- Días activos -->
    <div v-if="viewMode === 'calendar'" class="space-y-3">
      <div v-if="compact" class="flex items-center gap-1 bg-overlay border border-border rounded-md p-0.5 w-fit">
        <button
          @click="viewMode = 'heatmap'"
          class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
          :class="viewMode === 'heatmap' ? 'bg-accent text-white' : 'text-text-muted hover:text-text'"
        >
          Heatmap
        </button>
        <button
          @click="viewMode = 'calendar'"
          class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
          :class="viewMode === 'calendar' ? 'bg-accent text-white' : 'text-text-muted hover:text-text'"
        >
          Calendario
        </button>
      </div>
      <AttendanceCalendar
        :attendances="attendances"
        :settings="settings"
        :summary="summary"
        :compact="compact"
      />
    </div>

    <div v-else class="bg-surface border border-border rounded-lg p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-text">Días activos</h3>
        <div class="flex items-center gap-3">
          <div v-if="compact" class="flex items-center gap-1 bg-overlay border border-border rounded-md p-0.5">
            <button
              @click="viewMode = 'heatmap'"
              class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
              :class="viewMode === 'heatmap' ? 'bg-accent text-white' : 'text-text-muted hover:text-text'"
            >
              Heatmap
            </button>
            <button
              @click="viewMode = 'calendar'"
              class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
              :class="viewMode === 'calendar' ? 'bg-accent text-white' : 'text-text-muted hover:text-text'"
            >
              Calendario
            </button>
          </div>
          <div v-if="viewMode === 'heatmap'" class="hidden sm:flex items-center gap-1 text-[10px] text-text-muted">
            <span>Menos</span>
            <span
              v-for="(c, i) in HEAT_COLORS"
              :key="i"
              class="w-2.5 h-2.5 rounded-[2px] inline-block border border-border"
              :style="{ background: c }"
            ></span>
            <span>Más</span>
          </div>
        </div>
      </div>

      <div ref="heatmapRef" class="w-full">
      <div v-if="heatCells.length === 0" class="text-sm text-text-muted">
        Configura el inicio de tu pasantía para ver el calendario de actividad.
      </div>
        <svg
          v-else
          class="block w-full"
          :height="heatH + BOTTOM_H"
          :viewBox="`0 0 ${heatW} ${heatH + BOTTOM_H}`"
          preserveAspectRatio="none"
        >
          <g v-for="c in heatCells" :key="c.date">
            <rect
              :x="cellX(c.week)"
              :y="cellY(c.day)"
              :width="CELL"
              :height="CELL"
              rx="2"
              :style="{ fill: HEAT_COLORS[c.level], stroke: 'var(--color-border)' }"
              stroke-width="1"
            >
              <title>{{ formatLongDate(c.date) }}: {{ c.hours }}h</title>
            </rect>
          </g>
          <g v-for="p in placeholderCells" :key="`${p.week}-${p.day}`">
            <rect
              :x="cellX(p.week)"
              :y="cellY(p.day)"
              :width="CELL"
              :height="CELL"
              rx="2"
              :style="{ fill: 'var(--color-overlay)', stroke: 'var(--color-border)' }"
              stroke-width="1"
            ></rect>
          </g>
          <g v-if="targetEndWeek">
            <rect
              :x="cellX(targetEndWeek) - 1"
              :y="TOP_H - 4"
              :width="CELL + 2"
              :height="7 * (CELL + CELL_GAP) + 8"
              rx="2"
              fill="none"
              :stroke="'var(--color-warning)'"
              stroke-width="2"
              stroke-dasharray="4 3"
            >
              <title>Fin estimado de la pasantía</title>
            </rect>
          </g>
          <g v-if="estimatedEndWeek">
            <rect
              :x="cellX(estimatedEndWeek) - 1"
              :y="TOP_H - 4"
              :width="CELL + 2"
              :height="7 * (CELL + CELL_GAP) + 8"
              rx="2"
              fill="none"
              :stroke="'var(--color-accent)'"
              stroke-width="2"
            >
              <title>Posible final al ritmo actual</title>
            </rect>
          </g>
          <text
            v-for="(label, day) in DAY_LABELS"
            :key="day"
            :x="LEFT_W - 5"
            :y="cellY(day) + CELL / 2 + fontS / 2"
            text-anchor="end"
            :font-size="fontS"
            :style="{ fill: 'var(--color-text-muted)' }"
          >
            {{ label }}
          </text>
          <text
            v-for="ml in monthLabels"
            :key="ml.week"
            :x="cellX(ml.week)"
            :y="TOP_H - 6"
            :font-size="fontS"
            :style="{ fill: 'var(--color-text-muted)' }"
          >
            {{ ml.label }}
          </text>
          <text
            v-for="wd in weekDates"
            :key="wd.week"
            v-show="wd.week % dateStep === 0 || wd.week === displayWeeks"
            :x="cellX(wd.week) + CELL / 2"
            :y="heatH + BOTTOM_H - 6"
            text-anchor="middle"
            :font-size="fontS"
            :style="{ fill: 'var(--color-text-muted)' }"
          >
            {{ formatShortDate(wd.date) }}
          </text>
        </svg>
      </div>
      <div v-if="targetEndWeek || estimatedEndWeek" class="flex flex-wrap gap-4 text-[11px] text-text-muted pt-1">
        <span v-if="targetEndWeek" class="inline-flex items-center gap-1.5">
          <span class="inline-block w-3.5 h-2 rounded-[2px] border-2 border-dashed" style="border-color: var(--color-warning)"></span>
          Fin estimado de la pasantía
        </span>
        <span v-if="estimatedEndWeek" class="inline-flex items-center gap-1.5">
          <span class="inline-block w-3.5 h-2 rounded-[2px] border-2" style="border-color: var(--color-accent)"></span>
          Posible final al ritmo actual
        </span>
      </div>
    </div>
  </div>
</template>
