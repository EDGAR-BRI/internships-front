<script setup lang="ts">
import { ref, watch } from 'vue'
import type { LogEntry, LogEntryFormData } from '../composables/useLogEntries'
import DictationButton from './DictationButton.vue'

const props = defineProps<{
  entry?: LogEntry | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  saved: [entry: LogEntry]
}>()

const name = ref('')
const status = ref<'pending' | 'in_progress' | 'done'>('pending')
const week = ref<number | null>(null)
const area = ref('')
const datStart = ref('')
const datEnd = ref('')
const theory = ref('')
const attitudes = ref('')
const impact = ref('')
const resources = ref('')
const showDetails = ref(false)
const saving = ref(false)
const saveError = ref('')

function getTodayLocal(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      if (props.entry) {
        name.value = props.entry.name
        status.value = props.entry.status
        week.value = props.entry.week
        area.value = props.entry.area || ''
        datStart.value = props.entry.datStart ? props.entry.datStart.slice(0, 16) : ''
        datEnd.value = props.entry.datEnd ? props.entry.datEnd.slice(0, 16) : ''
        theory.value = props.entry.theory || ''
        attitudes.value = props.entry.attitudes || ''
        impact.value = props.entry.impact || ''
        resources.value = props.entry.resources || ''
        showDetails.value = !!(
          props.entry.theory ||
          props.entry.attitudes ||
          props.entry.impact ||
          props.entry.resources ||
          props.entry.week ||
          props.entry.area
        )
      } else {
        name.value = ''
        status.value = 'pending'
        week.value = null
        area.value = ''
        datStart.value = getTodayLocal()
        datEnd.value = ''
        theory.value = ''
        attitudes.value = ''
        impact.value = ''
        resources.value = ''
        showDetails.value = false
      }
      saveError.value = ''
    }
  }
)

async function handleSubmit() {
  if (!name.value.trim()) {
    saveError.value = 'El nombre de la actividad es obligatorio'
    return
  }

  if (!datStart.value) {
    saveError.value = 'La fecha de inicio es obligatoria'
    return
  }

  saving.value = true
  saveError.value = ''

  try {
    const { useLogEntries } = await import('../composables/useLogEntries')
    const { createLogEntry, updateLogEntry } = useLogEntries()

    const formData: LogEntryFormData = {
      name: name.value.trim(),
      status: status.value,
      week: typeof week.value === 'number' ? week.value : null,
      area: area.value.trim() || null,
      datStart: datStart.value,
      datEnd: datEnd.value || null,
      theory: theory.value.trim() || null,
      attitudes: attitudes.value.trim() || null,
      impact: impact.value.trim() || null,
      resources: resources.value.trim() || null,
    }

    let savedEntry: LogEntry
    if (props.entry) {
      savedEntry = await updateLogEntry(props.entry.id, formData)
    } else {
      savedEntry = await createLogEntry(formData)
    }

    emit('saved', savedEntry)
    emit('close')
  } catch (e: any) {
    saveError.value = e.message || 'Error al guardar'
  } finally {
    saving.value = false
  }
}

function appendTranscript(field: 'theory' | 'attitudes' | 'impact' | 'resources', text: string) {
  const current = field === 'theory' ? theory.value : field === 'attitudes' ? attitudes.value : field === 'impact' ? impact.value : resources.value
  const next = current ? `${current} ${text}` : text
  if (field === 'theory') theory.value = next
  else if (field === 'attitudes') attitudes.value = next
  else if (field === 'impact') impact.value = next
  else resources.value = next
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm"
        @click="handleBackdropClick"
        @keydown="handleKeydown"
      >
        <div
          class="bg-surface border border-border rounded-lg w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
          @click.stop
        >
          <div class="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
            <h2 class="text-lg font-semibold text-text">
              {{ entry ? 'Editar actividad' : 'Nueva actividad' }}
            </h2>
            <button
              @click="emit('close')"
              class="text-text-muted hover:text-text transition-colors p-1.5 rounded-md hover:bg-hover"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleSubmit" class="flex flex-col flex-1 overflow-hidden">
            <div class="px-6 py-5 space-y-5 overflow-y-auto flex-1 min-w-0">
              <div v-if="saveError" class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-3">
                {{ saveError }}
              </div>

              <div class="space-y-1.5 min-w-0">
                <label for="log-entry-name" class="block text-xs font-medium text-text">
                  Nombre <span class="text-error">*</span>
                </label>
                <input
                  id="log-entry-name"
                  v-model="name"
                  type="text"
                  placeholder="Nombre de la actividad"
                  class="w-full box-border bg-surface border border-border rounded-md px-2.5 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent min-w-0"
                />
              </div>

              <div class="space-y-1.5 min-w-0">
                <label for="log-entry-status" class="block text-xs font-medium text-text">
                  Estado
                </label>
                <select
                  id="log-entry-status"
                  v-model="status"
                  class="w-full box-border h-[38px] appearance-none bg-surface bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23878787%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat border border-border rounded-md px-2.5 pr-8 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent min-w-0"
                >
                  <option class="bg-surface text-text" value="pending">Pendiente</option>
                  <option class="bg-surface text-text" value="in_progress">En curso</option>
                  <option class="bg-surface text-text" value="done">Terminada</option>
                </select>
              </div>

              <div class="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-5">
                <div class="space-y-1.5 min-w-0">
                  <label for="log-entry-week" class="block text-xs font-medium text-text">
                    Semana #
                  </label>
                  <input
                    id="log-entry-week"
                    v-model.number="week"
                    type="number"
                    min="1"
                    placeholder="Ej. 3"
                    class="w-full box-border bg-surface border border-border rounded-md px-2.5 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent min-w-0"
                  />
                </div>

                <div class="space-y-1.5 min-w-0">
                  <label for="log-entry-area" class="block text-xs font-medium text-text">
                    Área / Departamento
                  </label>
                  <input
                    id="log-entry-area"
                    v-model="area"
                    type="text"
                    placeholder="Ej. Desarrollo"
                    class="w-full box-border bg-surface border border-border rounded-md px-2.5 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent min-w-0"
                  />
                </div>
              </div>

              <div class="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-5">
                <div class="space-y-1.5 min-w-0">
                  <label for="log-entry-dat-start" class="block text-xs font-medium text-text">
                    Inicio <span class="text-error">*</span>
                  </label>
                  <input
                    id="log-entry-dat-start"
                    v-model="datStart"
                    type="datetime-local"
                    class="w-full box-border bg-surface border border-border rounded-md px-2.5 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent min-w-0"
                  />
                </div>

                <div class="space-y-1.5 min-w-0">
                  <label for="log-entry-dat-end" class="block text-xs font-medium text-text">
                    Fin
                  </label>
                  <input
                    id="log-entry-dat-end"
                    v-model="datEnd"
                    type="datetime-local"
                    class="w-full box-border bg-surface border border-border rounded-md px-2.5 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent min-w-0"
                  />
                </div>
              </div>

              <div class="border-t border-border pt-2">
                <button
                  type="button"
                  @click="showDetails = !showDetails"
                  class="flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent transition-colors w-full py-1.5"
                >
                  <svg
                    class="w-3.5 h-3.5 transition-transform duration-200"
                    :class="{ 'rotate-90': showDetails }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                  Detalles adicionales
                </button>

                <Transition name="expand">
                  <div v-if="showDetails" class="mt-3 space-y-4 min-w-0">
                    <div class="space-y-1.5 min-w-0">
                      <div class="flex items-center justify-between gap-2">
                        <label for="log-entry-theory" class="block text-xs font-medium text-text">
                          Teorías
                        </label>
                        <DictationButton @dictated="(t) => appendTranscript('theory', t)" />
                      </div>
                      <textarea
                        id="log-entry-theory"
                        v-model="theory"
                        rows="3"
                        placeholder="Teorías aprendidas en tus estudios que aplicaste"
                        class="w-full box-border bg-surface border border-border rounded-md px-2.5 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none min-w-0"
                      ></textarea>
                    </div>

                    <div class="space-y-1.5 min-w-0">
                      <div class="flex items-center justify-between gap-2">
                        <label for="log-entry-attitudes" class="block text-xs font-medium text-text">
                          Nuevos aprendizajes
                        </label>
                        <DictationButton @dictated="(t) => appendTranscript('attitudes', t)" />
                      </div>
                      <textarea
                        id="log-entry-attitudes"
                        v-model="attitudes"
                        rows="3"
                        placeholder="Conocimientos o habilidades prácticas aprendidas"
                        class="w-full box-border bg-surface border border-border rounded-md px-2.5 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none min-w-0"
                      ></textarea>
                    </div>

                    <div class="space-y-1.5 min-w-0">
                      <div class="flex items-center justify-between gap-2">
                        <label for="log-entry-impact" class="block text-xs font-medium text-text">
                          Impacto
                        </label>
                        <DictationButton @dictated="(t) => appendTranscript('impact', t)" />
                      </div>
                      <textarea
                        id="log-entry-impact"
                        v-model="impact"
                        rows="3"
                        placeholder="¿Qué te impresionó o impactó?"
                        class="w-full box-border bg-surface border border-border rounded-md px-2.5 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none min-w-0"
                      ></textarea>
                    </div>

                    <div class="space-y-1.5 min-w-0">
                      <div class="flex items-center justify-between gap-2">
                        <label for="log-entry-resources" class="block text-xs font-medium text-text">
                          Otros elementos a considerar
                        </label>
                        <DictationButton @dictated="(t) => appendTranscript('resources', t)" />
                      </div>
                      <textarea
                        id="log-entry-resources"
                        v-model="resources"
                        rows="3"
                        placeholder="Otros elementos o recursos"
                        class="w-full box-border bg-surface border border-border rounded-md px-2.5 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none min-w-0"
                      ></textarea>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 px-6 py-5 border-t border-border flex-shrink-0">
              <button
                type="button"
                @click="emit('close')"
                class="px-4 py-2 text-sm text-text-muted hover:text-text hover:bg-hover rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-md text-sm font-medium transition-colors duration-150"
              >
                {{ saving ? 'Guardando...' : (entry ? 'Guardar' : 'Crear') }}
              </button>
            </div>
          </form>
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

.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
