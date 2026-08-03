<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Note } from '../composables/useNotes'
import DictationButton from './DictationButton.vue'

const props = defineProps<{
  note?: Note | null
  isOpen: boolean
  logEntryId?: number | null
}>()

const emit = defineEmits<{
  close: []
  saved: [note: Note]
}>()

const content = ref('')
const saving = ref(false)
const saveError = ref('')

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      content.value = props.note?.content || ''
      saveError.value = ''
    }
  }
)

async function handleSubmit() {
  if (!content.value.trim()) {
    saveError.value = 'La nota no puede estar vacía'
    return
  }

  saving.value = true
  saveError.value = ''

  try {
    const { useNotes } = await import('../composables/useNotes')
    const { createNote, updateNote } = useNotes()

    let savedNote: Note
    if (props.note) {
      savedNote = await updateNote(props.note.id, content.value.trim())
    } else {
      savedNote = await createNote({
        content: content.value.trim(),
        logEntryId: props.logEntryId ?? null,
      })
    }

    emit('saved', savedNote)
    emit('close')
  } catch (e: any) {
    saveError.value = e.message || 'Error al guardar'
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

function appendTranscript(text: string) {
  content.value = content.value ? `${content.value} ${text}` : text
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
          class="bg-surface border border-border rounded-lg w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
          @click.stop
        >
          <div class="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
            <h2 class="text-lg font-semibold text-text">
              {{ note ? 'Editar nota' : 'Nueva nota' }}
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

              <div v-if="logEntryId && !note" class="bg-accent/10 border border-accent/20 text-accent text-sm rounded-md p-3">
                Esta nota se guardará como nota extra de la actividad.
              </div>

              <div class="space-y-1.5 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <label for="note-content" class="block text-sm font-medium text-text">
                    Nota <span class="text-error">*</span>
                  </label>
                  <DictationButton @dictated="appendTranscript" />
                </div>
                <textarea
                  id="note-content"
                  v-model="content"
                  rows="5"
                  placeholder="Escribe o dicta tu nota..."
                  class="w-full box-border bg-surface border border-border rounded-md px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none min-w-0"
                ></textarea>
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
                {{ saving ? 'Guardando...' : (note ? 'Guardar' : 'Crear') }}
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
</style>
