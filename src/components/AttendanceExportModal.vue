<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AttendanceExportMode } from '../utils/exportAttendanceDocx'

const props = defineProps<{
  open: boolean
  missingData: string[]
  showExtraOptions: boolean
}>()

const emit = defineEmits<{
  close: []
  export: [mode: AttendanceExportMode]
}>()

const selected = ref<AttendanceExportMode | null>(null)
const confirmMissing = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) {
      selected.value = null
      confirmMissing.value = false
    }
  }
)

function pick(mode: AttendanceExportMode) {
  selected.value = mode
  if (props.missingData.length > 0) {
    confirmMissing.value = true
    return
  }
  emit('export', mode)
  emit('close')
}

function exportAnyway() {
  if (!selected.value) return
  emit('export', selected.value)
  emit('close')
}

function completeData() {
  emit('close')
  window.dispatchEvent(new CustomEvent('open-settings-modal'))
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  }
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
          class="bg-canvas border border-border rounded-lg w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto modal-open"
          @click.stop
        >
          <div class="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <h2 class="text-lg font-semibold text-text">Exportar control de asistencia</h2>
            <button
              @click="emit('close')"
              class="text-text-muted hover:text-text transition-colors p-1.5 rounded-md hover:bg-hover"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="overflow-y-auto p-4 sm:p-6 space-y-3">
            <div
              v-if="confirmMissing && selected"
              class="bg-warning/10 border border-warning/20 rounded-md p-3 space-y-3"
            >
              <p class="text-sm text-warning">
                Te faltan por completar en <span class="font-medium">Ajustes</span>:
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
                  @click="confirmMissing = false"
                  class="flex-1 bg-overlay hover:bg-hover text-text-secondary hover:text-text px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Volver
                </button>
                <button
                  @click="completeData"
                  class="flex-1 bg-warning/15 hover:bg-warning/25 text-warning px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Completar datos
                </button>
                <button
                  @click="exportAnyway"
                  class="flex-1 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Exportar igualmente
                </button>
              </div>
            </div>

            <template v-else>
              <button
                type="button"
                @click="pick('standard')"
                :class="selected === 'standard' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/60'"
                class="w-full text-left border rounded-lg p-3 space-y-1 transition-colors"
              >
                <p class="text-sm font-medium text-text">Control de asistencia (estándar)</p>
                <p class="text-xs text-text-muted">
                  Formato semanal con las horas de jornada configuradas. Cada día cuenta la jornada completa.
                </p>
              </button>

              <button
                v-if="showExtraOptions"
                type="button"
                @click="pick('complete')"
                :class="selected === 'complete' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/60'"
                class="w-full text-left border rounded-lg p-3 space-y-1 transition-colors"
              >
                <p class="text-sm font-medium text-text">Horas completas (días reales)</p>
                <p class="text-xs text-text-muted">
                  Muestra todos los días reales con las horas que exceden 8h y el total acumulado de días y horas.
                </p>
              </button>

              <button
                v-if="showExtraOptions"
                type="button"
                @click="pick('days8')"
                :class="selected === 'days8' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/60'"
                class="w-full text-left border rounded-lg p-3 space-y-1 transition-colors"
              >
                <p class="text-sm font-medium text-text">Días de 8h + acumulado (45 días)</p>
                <p class="text-xs text-text-muted">
                  Cada día cuenta 8h y las horas extra se acumulan como días con fecha tentativa hasta completar 45 días.
                </p>
              </button>

              <p v-if="!showExtraOptions" class="text-xs text-text-muted pt-1">
                Las opciones de doble jornada aparecen cuando algún día supera las 8 horas.
              </p>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
</style>