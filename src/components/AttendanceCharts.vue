<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAttendances } from '../composables/useAttendances'
import { useSettings } from '../composables/useSettings'

const props = withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const { attendances, summary, fetchAttendances, fetchSummary } = useAttendances()
const { settings, fetchSettings } = useSettings()

onMounted(() => {
  fetchAttendances()
  fetchSummary()
  fetchSettings()
})

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

const weeklyHours = computed(() => {
  if (!settings.value?.startDate) return []
  const start = settings.value.startDate.slice(0, 10)
  const map = new Map<string, number>()
  for (const a of attendances.value) {
    map.set(a.date.slice(0, 10), (map.get(a.date.slice(0, 10)) || 0) + a.hours)
  }
  const weeks = new Map<number, number>()
  for (const [date, hours] of map.entries()) {
    const week = computeWeekIndex(start, date)
    if (week === null) continue
    weeks.set(week, (weeks.get(week) || 0) + hours)
  }
  return Array.from(weeks.entries())
    .sort(([a], [b]) => a - b)
    .map(([week, hours]) => ({ week, hours: Math.round(hours * 10) / 10 }))
})

function computeWeekIndex(start: string, date: string): number | null {
  const s = new Date(start + 'T00:00:00')
  const d = new Date(date + 'T00:00:00')
  if (isNaN(s.getTime()) || isNaN(d.getTime()) || d < s) return null
  const diffDays = Math.floor((d.getTime() - s.getTime()) / 86400000)
  return Math.floor(diffDays / 7) + 1
}

const maxWeekly = computed(() => Math.max(1, ...weeklyHours.value.map((p) => p.hours)))

const BAR_W = 26
const BAR_GAP = 10
const CHART_H = 140
const LABEL_H = 18
const svgW = computed(() => weeklyHours.value.length * (BAR_W + BAR_GAP) + BAR_GAP)
const labelStep = computed(() => Math.max(1, Math.ceil(weeklyHours.value.length / 10)))

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
      const level = hours <= 0 ? 0 : hours <= 2 ? 1 : hours <= 4 ? 2 : hours <= 6 ? 3 : 4
      cells.push({ week, day, date, hours, level })
    }
    cur.setDate(cur.getDate() + 1)
  }
  return cells
})

const totalWeeks = computed(() => Math.max(1, ...heatCells.value.map((c) => c.week)))

const CELL = 13
const CELL_GAP = 3
const heatH = computed(() => 7 * (CELL + CELL_GAP) + CELL_GAP)
const heatW = computed(() => totalWeeks.value * (CELL + CELL_GAP) + CELL_GAP)

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
    <!-- Horas por semana -->
    <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-text">Horas por semana</h3>
        <span class="text-xs text-text-muted">{{ weeklyHours.length }} semanas con registro</span>
      </div>
      <div v-if="weeklyHours.length === 0" class="text-sm text-text-muted">
        Aún no hay asistencias para graficar.
      </div>
      <div v-else class="overflow-x-auto pb-1">
        <svg :width="svgW" :height="CHART_H + LABEL_H" class="block">
          <g v-for="(p, i) in weeklyHours" :key="p.week">
            <rect
              :x="BAR_GAP + i * (BAR_W + BAR_GAP)"
              :y="CHART_H - (p.hours / maxWeekly) * CHART_H"
              :width="BAR_W"
              :height="(p.hours / maxWeekly) * CHART_H"
              rx="3"
              :style="{ fill: 'var(--color-accent)' }"
            >
              <title>Semana {{ p.week }}: {{ p.hours }}h</title>
            </rect>
            <text
              v-if="p.week % labelStep === 0 || i === weeklyHours.length - 1"
              :x="BAR_GAP + i * (BAR_W + BAR_GAP) + BAR_W / 2"
              :y="CHART_H + LABEL_H - 4"
              text-anchor="middle"
              class="fill-current"
              font-size="10"
            >
              {{ p.week }}
            </text>
          </g>
        </svg>
      </div>
    </div>

    <!-- Heatmap -->
    <div v-if="!compact" class="bg-surface border border-border rounded-lg p-4 space-y-3">
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
      <div v-else class="overflow-x-auto pb-1">
        <svg :width="heatW" :height="heatH" class="block">
          <g v-for="c in heatCells" :key="c.date">
            <rect
              :x="CELL_GAP + (c.week - 1) * (CELL + CELL_GAP)"
              :y="CELL_GAP + c.day * (CELL + CELL_GAP)"
              :width="CELL"
              :height="CELL"
              rx="2"
              :style="{ fill: HEAT_COLORS[c.level], stroke: 'var(--color-border)' }"
              stroke-width="1"
            >
              <title>{{ c.date }}: {{ c.hours }}h</title>
            </rect>
          </g>
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
