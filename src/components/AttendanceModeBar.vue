<script setup lang="ts">
import { computed } from 'vue'
import type { AttendanceSummary } from '../composables/useAttendances'

const props = defineProps<{ summary: AttendanceSummary | null }>()

const split = computed(() => {
  const s = props.summary
  if (!s) return null
  const total = s.onSiteDays + s.remoteDays
  if (total <= 0) return null
  return {
    onSite: s.onSiteDays,
    remote: s.remoteDays,
    onSitePct: Math.round((s.onSiteDays / total) * 100),
    remotePct: Math.round((s.remoteDays / total) * 100),
  }
})
</script>

<template>
  <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
    <h3 class="text-sm font-semibold text-text">Modalidad</h3>
    <div v-if="!split" class="text-sm text-text-muted">Sin datos de modalidad todavía.</div>
    <div v-else class="space-y-2">
      <div class="flex h-3 rounded-full overflow-hidden border border-border">
        <div
          class="bg-accent h-full transition-all"
          :style="{ width: split.onSitePct + '%' }"
          :title="`Presencial: ${split.onSite} días`"
        ></div>
        <div
          class="bg-warning h-full transition-all"
          :style="{ width: split.remotePct + '%' }"
          :title="`Remoto: ${split.remote} días`"
        ></div>
      </div>
      <div class="flex flex-wrap gap-4 text-xs">
        <span class="inline-flex items-center gap-1.5 text-text-muted">
          <span class="w-2.5 h-2.5 rounded-full bg-accent inline-block"></span>
          Presencial: <span class="text-text font-medium">{{ split.onSite }} días ({{ split.onSitePct }}%)</span>
        </span>
        <span class="inline-flex items-center gap-1.5 text-text-muted">
          <span class="w-2.5 h-2.5 rounded-full bg-warning inline-block"></span>
          Remoto: <span class="text-text font-medium">{{ split.remote }} días ({{ split.remotePct }}%)</span>
        </span>
      </div>
    </div>
  </div>
</template>
