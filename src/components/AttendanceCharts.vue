<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useAttendances } from '../composables/useAttendances'
import { useSettings } from '../composables/useSettings'

const props = withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const { attendances, summary, fetchAttendances, fetchSummary } = useAttendances()
const { settings, fetchSettings } = useSettings()

const containerRef = ref<HTMLDivElement | null>(null)
const containerW = ref(0)
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  fetchAttendances()
  fetchSummary()
  fetchSettings()
  resizeObserver = new ResizeObserver(() => {
    if (containerRef.value) containerW.value = containerRef.value.clientWidth
  })
  if (containerRef.value) resizeObserver.observe(containerRef.value)
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

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const weekDates = computed(() => {
  if (!settings.value?.startDate) return []
  const start = settings.value.startDate.slice(0, 10)
  const startDate = new Date(start + 'T00:00:00')
  const list: { week: number; date: string }[] = []
  for (let w = 1; w <= totalWeeks.value; w++) {
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

const dateStep = computed(() => Math.max(1, Math.ceil(totalWeeks.value / 10)))

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

const CELL_GAP = 3
const LEFT_W = 20
const TOP_H = 20
const BOTTOM_H = 20

const cellSize = computed(() => {
  const width = containerW.value
  if (!width || totalWeeks.value <= 0) return 12
  const max = Math.floor((width - LEFT_W - CELL_GAP) / totalWeeks.value - CELL_GAP)
  return Math.max(8, Math.min(30, max))
})

const fontM = computed(() => Math.max(10, Math.round(cellSize.value * 0.75)))
const fontS = computed(() => Math.max(9, Math.round(cellSize.value * 0.6)))

const heatH = computed(() => TOP_H + 7 * (cellSize.value + CELL_GAP) + CELL_GAP)
const heatW = computed(() => LEFT_W + totalWeeks.value * (cellSize.value + CELL_GAP) + CELL_GAP)

function cellX(week: number): number {
  return LEFT_W + CELL_GAP + (week - 1) * (cellSize.value + CELL_GAP)
}

function cellY(day: number): number {
  return TOP_H + CELL_GAP + day * (cellSize.value + CELL_GAP)
}

const HEAT_COLORS = [
  'transparent',
  'rgba(0, 112, 243, 0.22)',
  'rgba(0, 112, 243, 0.45)',
  'rgba(0, 112, 243, 0.7)',
  '#0070f3',
]

const modeSplit = computed(() => {
  if (!summary.value) return null
  const total = summary.value.onSiteDays + summary.value.remoteDays
  if (total <= 0) return null
  return {
    total,
    onSite: summary.value.onSiteDays,
    remote: summary.value.remoteDays,
    onSitePct: Math.round((summary.value.onSiteDays / total) * 100),
    remotePct: Math.round((summary.value.remoteDays / total) * 100),
  }
})
</script>

<template>
  <div class="grid grid-cols-1 gap-4">
    <!-- Heatmap -->
    <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-text">Días activos</h3>
        <div class="flex items-center gap-1 text-[10px] text-text-muted">
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
      <div v-if="heatCells.length === 0" class="text-sm text-text-muted">
        Configura el inicio de tu pasantía para ver el calendario de actividad.
      </div>
      <div v-else ref="containerRef" class="w-full">
        <svg :width="heatW" :height="heatH + BOTTOM_H" class="block" :viewBox="`0 0 ${heatW} ${heatH + BOTTOM_H}`">
          <g v-for="c in heatCells" :key="c.date">
            <rect
              :x="cellX(c.week)"
              :y="cellY(c.day)"
              :width="cellSize"
              :height="cellSize"
              rx="2"
              :style="{ fill: HEAT_COLORS[c.level], stroke: 'var(--color-border)' }"
              stroke-width="1"
            >
              <title>{{ formatLongDate(c.date) }}: {{ c.hours }}h</title>
            </rect>
          </g>
          <text
            v-for="(label, day) in DAY_LABELS"
            :key="day"
            :x="LEFT_W - 5"
            :y="cellY(day) + cellSize / 2 + fontS / 2"
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
            v-show="wd.week % dateStep === 0 || wd.week === totalWeeks"
            :x="cellX(wd.week) + cellSize / 2"
            :y="heatH + BOTTOM_H - 6"
            text-anchor="middle"
            :font-size="fontS"
            :style="{ fill: 'var(--color-text-muted)' }"
          >
            {{ formatShortDate(wd.date) }}
          </text>
        </svg>
      </div>
    </div>

    <!-- Modalidad -->
    <div v-if="!compact" class="bg-surface border border-border rounded-lg p-4 space-y-3">
      <h3 class="text-sm font-semibold text-text">Modalidad</h3>
      <div v-if="!modeSplit" class="text-sm text-text-muted">Sin datos de modalidad todavía.</div>
      <div v-else class="space-y-2">
        <div class="flex h-3 rounded-full overflow-hidden border border-border">
          <div
            class="bg-accent h-full transition-all"
            :style="{ width: modeSplit.onSitePct + '%' }"
            :title="`Presencial: ${modeSplit.onSite} días`"
          ></div>
          <div
            class="bg-warning h-full transition-all"
            :style="{ width: modeSplit.remotePct + '%' }"
            :title="`Remoto: ${modeSplit.remote} días`"
          ></div>
        </div>
        <div class="flex flex-wrap gap-4 text-xs">
          <span class="inline-flex items-center gap-1.5 text-text-muted">
            <span class="w-2.5 h-2.5 rounded-full bg-accent inline-block"></span>
            Presencial: <span class="text-text font-medium">{{ modeSplit.onSite }} días ({{ modeSplit.onSitePct }}%)</span>
          </span>
          <span class="inline-flex items-center gap-1.5 text-text-muted">
            <span class="w-2.5 h-2.5 rounded-full bg-warning inline-block"></span>
            Remoto: <span class="text-text font-medium">{{ modeSplit.remote }} días ({{ modeSplit.remotePct }}%)</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
