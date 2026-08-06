<script setup lang="ts">
import { ref, watch, computed, onMounted, nextTick } from 'vue'
import type { Note } from '../composables/useNotes'
import { useNotes } from '../composables/useNotes'
import { useLogEntries, type LogEntry } from '../composables/useLogEntries'
import { appendDictatedText } from '../composables/useSpeechRecognition'
import { NOTE_TAGS, NOTE_TAG_VALUES, type NoteTag } from '../utils/noteTags'
import DictationButton from './DictationButton.vue'

const props = defineProps<{
  note?: Note | null
  isOpen: boolean
  logEntryId?: number | null
  viewOnly?: boolean
}>()

const emit = defineEmits<{
  close: []
  saved: [note: Note]
}>()

const { logEntries, fetchLogEntries } = useLogEntries()
const { notes, fetchNotes } = useNotes()

const title = ref('')
const content = ref('')
const tag = ref<string>('general')
const selectedLogEntryId = ref<number | null>(null)
const noteDate = ref('')
const activitySearch = ref('')
const showDropdown = ref(false)
const saving = ref(false)
const saveError = ref('')
const isViewing = ref(false)

function isPresetTag(v: string): boolean {
  return NOTE_TAG_VALUES.includes(v)
}

const customTagInput = computed({
  get: () => (isPresetTag(tag.value) ? '' : tag.value),
  set: (v: string) => {
    tag.value = v.trim()
  },
})

function selectTag(v: string) {
  tag.value = v
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const filteredActivities = computed(() => {
  if (!activitySearch.value.trim()) return logEntries.value
  const q = activitySearch.value.toLowerCase()
  return logEntries.value.filter((e) => e.name.toLowerCase().includes(q))
})

const selectedActivityName = computed(() => {
  if (!selectedLogEntryId.value) return ''
  return logEntries.value.find((e) => e.id === selectedLogEntryId.value)?.name || ''
})

onMounted(() => {
  fetchLogEntries()
})

function utcToLocal(utcStr: string): string {
  const d = new Date(utcStr)
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

function toLocalInput(d: Date): string {
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

function nowInput(): string {
  return toLocalInput(new Date())
}

function lastNoteAfter(entry: LogEntry): string {
  const entryNotes = notes.value
    .filter((n) => n.logEntryId === entry.id && n.date)
    .map((n) => new Date(n.date!))
    .sort((a, b) => b.getTime() - a.getTime())

  const last = entryNotes[0]
  if (last) return toLocalInput(new Date(last.getTime() + 60000))
  if (entry.datStart) return utcToLocal(entry.datStart)
  return nowInput()
}

watch(
  () => props.isOpen,
  async (open) => {
    if (open) {
      isViewing.value = props.viewOnly ?? false
      title.value = props.note?.title || ''
      content.value = props.note?.content || ''
      tag.value = (props.note?.tag as NoteTag) || 'general'
      selectedLogEntryId.value = props.logEntryId ?? props.note?.logEntryId ?? null
      if (!props.note) {
        await fetchNotes()
      }
      if (props.note) {
        noteDate.value = props.note.date ? utcToLocal(props.note.date) : ''
      } else if (props.logEntryId) {
        const entry = logEntries.value.find((e) => e.id === props.logEntryId)
        noteDate.value = entry ? lastNoteAfter(entry) : nowInput()
      } else {
        noteDate.value = nowInput()
      }
      activitySearch.value = selectedActivityName.value
      saveError.value = ''
      showDropdown.value = false
      nextTick(() => {
        const textarea = document.getElementById('note-content') as HTMLTextAreaElement | null
        if (textarea) {
          textarea.style.height = 'auto'
          textarea.style.height = textarea.scrollHeight + 'px'
        }
      })
    }
  }
)

watch(content, () => {
  nextTick(() => {
    const textarea = document.getElementById('note-content') as HTMLTextAreaElement | null
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = textarea.scrollHeight + 'px'
    }
  })
})

const isFixedActivity = () => !!props.logEntryId && !props.note

async function selectActivity(entry: LogEntry | null) {
  selectedLogEntryId.value = entry?.id ?? null
  activitySearch.value = entry?.name || ''
  showDropdown.value = false
  if (entry) {
    await fetchNotes()
    noteDate.value = lastNoteAfter(entry)
  } else {
    noteDate.value = nowInput()
  }
}

function onSearchFocus() {
  showDropdown.value = true
}

function onSearchBlur() {
  setTimeout(() => {
    showDropdown.value = false
    if (!selectedLogEntryId.value) {
      activitySearch.value = ''
    } else {
      activitySearch.value = selectedActivityName.value
    }
  }, 200)
}

async function handleSubmit() {
  if (!content.value.trim()) {
    saveError.value = 'La nota no puede estar vacía'
    return
  }

  saving.value = true
  saveError.value = ''

  const normalizedTag = tag.value.trim() || 'general'

  try {
    const { useNotes } = await import('../composables/useNotes')
    const { createNote, updateNote } = useNotes()

    let savedNote: Note
    if (props.note) {
      savedNote = await updateNote(props.note.id, {
        title: title.value.trim() || null,
        content: content.value.trim(),
        tag: normalizedTag,
        logEntryId: selectedLogEntryId.value,
        date: noteDate.value || null,
      })
    } else {
      savedNote = await createNote({
        title: title.value.trim() || null,
        content: content.value.trim(),
        tag: normalizedTag,
        logEntryId: selectedLogEntryId.value ?? null,
        date: noteDate.value || null,
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
  content.value = appendDictatedText(content.value, text)
}

function autoResize(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}
</script>

<template>
  <div
      v-if="isOpen"
      class="fixed inset-0 z-[60] overflow-y-auto bg-black/60 backdrop-blur-sm"
      @click="handleBackdropClick"
      @keydown="handleKeydown"
    >
      <div
        class="min-h-full flex items-center justify-center p-4 sm:p-6"
      >
        <div
          class="bg-surface border border-border rounded-lg w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto modal-open"
          @click.stop
        >
          <div class="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
            <h2 class="text-lg font-semibold text-text">
              {{ isViewing ? 'Nota' : (note ? 'Editar nota' : 'Nueva nota') }}
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

          <div v-if="isViewing" class="flex flex-col flex-1 overflow-hidden">
            <div class="px-6 py-5 space-y-4 overflow-y-auto flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                  :class="note?.logEntryId
                    ? 'bg-accent/10 text-accent'
                    : 'bg-warning/10 text-warning'"
                >
                  {{ note?.logEntryId ? 'Nota de actividad' : 'Individual' }}
                </span>
                <span class="inline-flex items-center text-[10px] gap-1 text-text-muted">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {{ note ? formatDate(note.date || note.createdAt) : '' }}
                </span>
              </div>
              <h3 v-if="note?.title" class="text-sm font-semibold text-text">
                {{ note.title }}
              </h3>
              <p class="text-sm text-text whitespace-pre-wrap break-words leading-relaxed">
                {{ note?.content }}
              </p>
            </div>
            <div class="flex items-center justify-end gap-2 px-6 py-5 border-t border-border flex-shrink-0">
              <button
                type="button"
                @click="emit('close')"
                class="px-4 py-2 text-sm text-text-muted hover:text-text hover:bg-hover rounded-md transition-colors"
              >
                Cerrar
              </button>
              <button
                type="button"
                @click="isViewing = false"
                class="bg-accent hover:bg-accent-hover text-white px-5 py-2 rounded-md text-sm font-medium transition-colors duration-150"
              >
                Editar
              </button>
            </div>
          </div>

          <form v-else @submit.prevent="handleSubmit" class="flex flex-col flex-1 overflow-hidden">
            <div class="px-6 py-5 space-y-5 overflow-y-auto flex-1 min-w-0">
              <div v-if="saveError" class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-3">
                {{ saveError }}
              </div>

              <div v-if="isFixedActivity()" class="bg-accent/10 border border-accent/20 text-accent text-sm rounded-md p-3">
                Esta nota se guardará como nota extra de la actividad.
              </div>

              <div v-if="!isFixedActivity()" class="space-y-1.5 min-w-0 relative">
                <label for="note-activity" class="block text-sm font-medium text-text">
                  Actividad
                </label>
                <input
                  id="note-activity"
                  v-model="activitySearch"
                  type="text"
                  placeholder="Buscar actividad..."
                  class="w-full box-border bg-surface border border-border rounded-md px-2.5 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent min-w-0"
                  @focus="onSearchFocus"
                  @blur="onSearchBlur"
                />
                <div
                  v-if="showDropdown"
                  class="absolute z-10 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-lg max-h-40 overflow-y-auto"
                >
                  <button
                    type="button"
                    @mousedown.prevent="selectActivity(null)"
                    class="w-full text-left px-3 py-2 text-sm text-text-muted hover:bg-hover transition-colors"
                  >
                    Sin actividad
                  </button>
                  <button
                    v-for="entry in filteredActivities"
                    :key="entry.id"
                    type="button"
                    @mousedown.prevent="selectActivity(entry)"
                    class="w-full text-left px-3 py-2 text-sm text-text hover:bg-hover transition-colors truncate"
                    :class="{ 'bg-accent/10 text-accent': entry.id === selectedLogEntryId }"
                  >
                    {{ entry.name }}
                  </button>
                  <p v-if="filteredActivities.length === 0" class="px-3 py-2 text-xs text-text-muted">
                    Sin resultados
                  </p>
                </div>
              </div>

              <div class="space-y-1.5 min-w-0">
                <label class="block text-sm font-medium text-text">Etiqueta</label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="t in NOTE_TAGS"
                    :key="t.value"
                    type="button"
                    @click="selectTag(t.value)"
                    class="px-3 py-1.5 rounded-md text-xs font-medium border transition-colors"
                    :class="tag === t.value
                      ? 'bg-accent text-white border-accent'
                      : 'bg-overlay text-text-secondary hover:text-text border-border'"
                  >
                    {{ t.label }}
                  </button>
                </div>
                <input
                  v-model="customTagInput"
                  type="text"
                  maxlength="30"
                  placeholder="O escribe tu propia etiqueta (opcional)"
                  class="w-full box-border bg-surface border border-border rounded-md px-2.5 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent min-w-0"
                />
              </div>

              <div class="space-y-1.5 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <label for="note-date" class="block text-sm font-medium text-text">
                    Fecha de la nota
                  </label>
                  <button
                    type="button"
                    @click="noteDate = nowInput()"
                    class="text-xs font-medium text-accent hover:text-accent-hover hover:underline transition-colors"
                  >
                    Ahora
                  </button>
                </div>
                <input
                  id="note-date"
                  v-model="noteDate"
                  type="datetime-local"
                  class="w-full box-border bg-surface border border-border rounded-md px-2.5 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent min-w-0"
                />
              </div>

              <div class="space-y-1.5 min-w-0">
                <label for="note-title" class="block text-sm font-medium text-text">
                  Título <span class="text-text-muted">(opcional)</span>
                </label>
                <input
                  id="note-title"
                  v-model="title"
                  type="text"
                  placeholder="Título de la nota"
                  class="w-full box-border bg-surface border border-border rounded-md px-2.5 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent min-w-0"
                />
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
                  class="w-full box-border bg-surface border border-border rounded-md px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none min-w-0 overflow-hidden"
                  @input="autoResize"
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
  </div>
</template>

<style scoped>
</style>
