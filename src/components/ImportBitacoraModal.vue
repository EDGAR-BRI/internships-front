<script setup lang="ts">
import { ref, watch } from 'vue'
import { useLogEntries } from '../composables/useLogEntries'
import { useNotes } from '../composables/useNotes'
import { parseBitacoraMarkdown, downloadTemplateMarkdown, type ParsedLogEntry, type ParsedNote } from '../utils/bitacoraImport'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  imported: []
}>()

const { createLogEntry } = useLogEntries()
const { createNote } = useNotes()

const fileInput = ref<HTMLInputElement | null>(null)
const fileName = ref('')
const parsedEntries = ref<ParsedLogEntry[]>([])
const parsedNotes = ref<ParsedNote[]>([])
const parseError = ref('')
const importing = ref(false)
const importError = ref('')
const importSuccess = ref('')

function todayInMexicoCity(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

function reset() {
  fileName.value = ''
  parsedEntries.value = []
  parsedNotes.value = []
  parseError.value = ''
  importError.value = ''
  importSuccess.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

watch(
  () => props.isOpen,
  (open) => {
    if (!open) reset()
  }
)

async function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  parseError.value = ''
  importError.value = ''
  importSuccess.value = ''
  fileName.value = file.name

  try {
    const text = await file.text()
    const result = parseBitacoraMarkdown(text)
    parsedEntries.value = result.logEntries
    parsedNotes.value = result.notes
    if (result.logEntries.length === 0 && result.notes.length === 0) {
      parseError.value = 'No se encontraron actividades ni notas en el archivo.'
    }
  } catch {
    parseError.value = 'No se pudo leer el archivo. Verifica que sea un .md válido.'
  }
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file) {
    const dt = new DataTransfer()
    dt.items.add(file)
    if (fileInput.value) fileInput.value.files = dt.files
    fileInput.value?.dispatchEvent(new Event('change'))
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
}

async function handleImport() {
  if (importing.value) return
  importing.value = true
  importError.value = ''
  importSuccess.value = ''
  let createdEntries = 0
  let createdNotes = 0

  try {
    for (const entry of parsedEntries.value) {
      if (!entry.name) continue
      const logEntry = await createLogEntry({
        name: entry.name,
        status: entry.status,
        week: entry.week,
        area: entry.area,
        theory: entry.theory,
        impact: entry.impact,
        resources: entry.resources,
        datStart: entry.datStart || todayInMexicoCity(),
        datEnd: entry.datEnd,
      })
      createdEntries++

      if (entry.attitudes && entry.attitudes.trim()) {
        await createNote({
          title: null,
          content: entry.attitudes,
          tag: 'aprendizaje',
          logEntryId: logEntry.id,
          date: entry.datStart,
        })
        createdNotes++
      }

      for (const note of entry.notes) {
        if (!note.content.trim()) continue
        await createNote({
          title: note.title,
          content: note.content,
          tag: note.tag,
          logEntryId: logEntry.id,
          date: note.date,
        })
        createdNotes++
      }
    }

    for (const note of parsedNotes.value) {
      if (!note.content.trim()) continue
      await createNote({
        title: note.title,
        content: note.content,
        tag: note.tag,
        logEntryId: null,
        date: note.date,
      })
      createdNotes++
    }

    importSuccess.value = `Importadas ${createdEntries} actividades y ${createdNotes} notas.`
    emit('imported')
  } catch (e: any) {
    importError.value = e.message || 'Error al importar'
  } finally {
    importing.value = false
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
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[70] overflow-y-auto bg-black/60 backdrop-blur-sm"
        @click="handleBackdropClick"
        @keydown="handleKeydown"
      >
        <div class="min-h-full flex items-center justify-center p-4 sm:p-6">
          <div
            class="bg-canvas border border-border rounded-lg w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto modal-open"
            @click.stop
          >
            <div class="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <h2 class="text-lg font-semibold text-text">Importar bitácora</h2>
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
              <button
                @click="downloadTemplateMarkdown"
                class="w-full flex items-center justify-center gap-2 bg-overlay hover:bg-hover border border-border text-text-secondary hover:text-text px-4 py-2.5 rounded-md text-sm font-medium transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar plantilla .md
              </button>

              <div
                @click="fileInput?.click()"
                @dragover="handleDragOver"
                @drop="handleDrop"
                class="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-accent transition-colors"
              >
                <svg class="w-8 h-8 mx-auto text-text-muted mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p class="text-sm text-text-secondary">
                  {{ fileName || 'Arrastra tu archivo .md aquí o haz clic para seleccionarlo' }}
                </p>
                <input
                  ref="fileInput"
                  type="file"
                  accept=".md,.markdown,text/markdown"
                  class="hidden"
                  @change="handleFileChange"
                />
              </div>

              <div v-if="parseError" class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-3">
                {{ parseError }}
              </div>
              <div v-if="importError" class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-3">
                {{ importError }}
              </div>
              <div v-if="importSuccess" class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm rounded-md p-3">
                {{ importSuccess }}
              </div>

              <div v-if="parsedEntries.length > 0 || parsedNotes.length > 0" class="space-y-2">
                <p class="text-sm font-medium text-text">
                  Se importarán <span class="text-accent">{{ parsedEntries.length }}</span> actividades y
                  <span class="text-accent">{{ parsedNotes.length }}</span> notas sueltas:
                </p>
                <div class="max-h-40 overflow-y-auto border border-border rounded-md divide-y divide-border">
                  <p
                    v-for="(entry, i) in parsedEntries"
                    :key="'e' + i"
                    class="px-3 py-1.5 text-sm text-text-secondary"
                  >
                    <span class="text-text">{{ entry.name }}</span>
                    <span v-if="entry.datStart"> · {{ entry.datStart }}</span>
                    <span v-if="entry.notes.length" class="text-text-muted"> · {{ entry.notes.length }} nota(s)</span>
                  </p>
                  <p
                    v-for="(note, i) in parsedNotes"
                    :key="'n' + i"
                    class="px-3 py-1.5 text-sm text-text-secondary"
                  >
                    <span class="text-text">{{ note.title || 'Sin título' }}</span>
                    <span v-if="note.date"> · {{ note.date }}</span>
                  </p>
                </div>
              </div>
            </div>

            <div class="flex gap-2 px-6 py-4 border-t border-border flex-shrink-0">
              <button
                @click="emit('close')"
                class="flex-1 bg-overlay hover:bg-hover text-text-secondary hover:text-text px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                @click="handleImport"
                :disabled="importing || (parsedEntries.length === 0 && parsedNotes.length === 0)"
                class="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {{ importing ? 'Importando...' : 'Importar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
  </Teleport>
</template>

<style scoped>
</style>
