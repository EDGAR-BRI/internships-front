<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAttendances, type Attendance } from '../composables/useAttendances'

const props = defineProps<{
  attendance: Attendance | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  saved: [attendance: Attendance]
}>()

const { updateAttendance } = useAttendances()

const date = ref('')
const isFullDay = ref(true)
const hours = ref<number | ''>('')
const mode = ref<'on_site' | 'remote'>('on_site')
const saving = ref(false)
const error = ref('')

watch(
  () => [props.isOpen, props.attendance],
  () => {
    if (props.isOpen && props.attendance) {
      date.value = props.attendance.date.slice(0, 10)
      isFullDay.value = !!props.attendance.isFullDay
      hours.value = props.attendance.isFullDay ? '' : props.attendance.hours
      mode.value = props.attendance.mode ?? 'on_site'
      error.value = ''
    }
  }
)

async function handleSave() {
  if (!props.attendance) return
  saving.value = true
  error.value = ''
  try {
    const payload: {
      date?: string
      isFullDay?: boolean
      hours?: number
      mode?: Attendance['mode']
    } = {
      date: date.value,
      mode: mode.value,
    }

    if (isFullDay.value) {
      payload.isFullDay = true
    } else {
      const hrs = Number(hours.value)
      if (!hrs || hrs <= 0) {
        error.value = 'Ingresa una cantidad válida de horas'
        return
      }
      payload.isFullDay = false
      payload.hours = hrs
    }

    const updated = await updateAttendance(props.attendance.id, payload)
    emit('saved', updated)
    emit('close')
  } catch (e: any) {
    error.value = e.message || 'Error al guardar'
  } finally {
    saving.value = false
  }
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
    <Transition name="modal">
      <div
        v-if="isOpen && attendance"
        class="fixed inset-0 z-[70] overflow-y-auto bg-black/60 backdrop-blur-sm"
        @click="handleBackdropClick"
        @keydown="handleKeydown"
      >
        <div class="min-h-full flex items-center justify-center p-4 sm:p-6">
          <div
            class="bg-canvas border border-border rounded-lg w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto"
            @click.stop
          >
            <div class="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <h2 class="text-lg font-semibold text-text">Editar asistencia</h2>
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

              <div class="space-y-1.5">
                <label class="block text-xs font-medium text-text-secondary">Fecha</label>
                <input
                  v-model="date"
                  type="date"
                  class="w-full bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              <div class="space-y-1.5">
                <label class="block text-xs font-medium text-text-secondary">Tipo</label>
                <div class="flex gap-2">
                  <button
                    @click="isFullDay = true"
                    :class="isFullDay ? 'bg-accent text-white' : 'bg-overlay text-text-secondary hover:text-text'"
                    class="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Día completo
                  </button>
                  <button
                    @click="isFullDay = false"
                    :class="!isFullDay ? 'bg-accent text-white' : 'bg-overlay text-text-secondary hover:text-text'"
                    class="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Parcial
                  </button>
                </div>
              </div>

              <div v-if="!isFullDay" class="space-y-1.5">
                <label class="block text-xs font-medium text-text-secondary">Horas</label>
                <input
                  v-model.number="hours"
                  type="number"
                  min="1"
                  max="24"
                  placeholder="Ej. 4"
                  class="w-full bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              <div class="space-y-1.5">
                <label class="block text-xs font-medium text-text-secondary">Modalidad</label>
                <div class="flex gap-2">
                  <button
                    @click="mode = 'on_site'"
                    :class="mode === 'on_site' ? 'bg-accent text-white' : 'bg-overlay text-text-secondary hover:text-text'"
                    class="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Presencial
                  </button>
                  <button
                    @click="mode = 'remote'"
                    :class="mode === 'remote' ? 'bg-accent text-white' : 'bg-overlay text-text-secondary hover:text-text'"
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
                class="flex-1 bg-error hover:bg-error-hover text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                @click="handleSave"
                :disabled="saving"
                class="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {{ saving ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
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
.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
  opacity: 0;
}
</style>
