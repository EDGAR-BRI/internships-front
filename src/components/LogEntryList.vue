<script setup lang="ts">
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { useLogEntries, type LogEntry } from '../composables/useLogEntries'
import { useNotes, type Note } from '../composables/useNotes'
import LogEntryCard from './LogEntryCard.vue'

const LogEntryModal = defineAsyncComponent(() => import('./LogEntryModal.vue'))
const NoteModal = defineAsyncComponent(() => import('./NoteModal.vue'))

const { logEntries, loading, error, fetchLogEntries, deleteLogEntry, updateLogEntry } = useLogEntries()
const { deleteNote } = useNotes()

const showModal = ref(false)
const editingEntry = ref<LogEntry | null>(null)
const activeFilter = ref<'all' | LogEntry['status']>('all')
const confirmDeleteId = ref<number | null>(null)

const noteModalOpen = ref(false)
const noteTargetEntry = ref<LogEntry | null>(null)
const editingNote = ref<Note | null>(null)

const filters: { value: 'all' | LogEntry['status']; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'done', label: 'Terminadas' },
]

const filteredEntries = computed(() => {
  if (activeFilter.value === 'all') return logEntries.value
  return logEntries.value.filter((t) => t.status === activeFilter.value)
})

const entryCounts = computed(() => ({
  all: logEntries.value.length,
  pending: logEntries.value.filter((t) => t.status === 'pending').length,
  in_progress: logEntries.value.filter((t) => t.status === 'in_progress').length,
  done: logEntries.value.filter((t) => t.status === 'done').length,
}))

onMounted(() => {
  fetchLogEntries()
})

function openCreateModal() {
  editingEntry.value = null
  showModal.value = true
}

function openCreateNote() {
  editingNote.value = null
  noteTargetEntry.value = null
  noteModalOpen.value = true
}

function openEditModal(entry: LogEntry) {
  editingEntry.value = entry
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingEntry.value = null
}

async function handleDelete(id: number) {
  if (confirmDeleteId.value === id) {
    await deleteLogEntry(id)
    confirmDeleteId.value = null
  } else {
    confirmDeleteId.value = id
    setTimeout(() => {
      if (confirmDeleteId.value === id) {
        confirmDeleteId.value = null
      }
    }, 3000)
  }
}

async function handleStatusChange(id: number, status: LogEntry['status']) {
  await updateLogEntry(id, { status })
}

function openAddNote(entry: LogEntry) {
  editingNote.value = null
  noteTargetEntry.value = entry
  noteModalOpen.value = true
}

function openEditNote(note: Note) {
  editingNote.value = note
  noteTargetEntry.value = null
  noteModalOpen.value = true
}

function closeNoteModal() {
  noteModalOpen.value = false
  noteTargetEntry.value = null
  editingNote.value = null
}

async function handleDeleteNote(id: number) {
  await deleteNote(id)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold tracking-tight">Actividades</h1>
      <div class="flex items-center gap-2 w-full sm:w-auto">
        <button
          @click="openCreateNote"
          class="bg-overlay hover:bg-hover text-text-secondary hover:text-text px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 flex items-center justify-center gap-2 flex-1 sm:flex-none"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Nueva nota
        </button>
        <button
          @click="openCreateModal"
          class="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 flex items-center justify-center gap-2 flex-1 sm:flex-none"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Nueva actividad
        </button>
      </div>
    </div>

    <div class="flex items-center gap-1.5 border-b border-border overflow-x-auto pb-2">
      <button
        v-for="filter in filters"
        :key="filter.value"
        @click="activeFilter = filter.value"
        class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap"
        :class="activeFilter === filter.value
          ? 'bg-accent text-white'
          : 'bg-overlay text-text-muted hover:text-text-secondary hover:bg-hover'"
      >
        {{ filter.label }}
        <span
          v-if="entryCounts[filter.value] > 0"
          class="text-[10px] px-1.5 py-0.5 rounded-full"
          :class="activeFilter === filter.value
            ? 'bg-black/25 text-white'
            : 'bg-canvas/60 text-text-secondary'"
        >
          {{ entryCounts[filter.value] }}
        </span>
      </button>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="w-6 h-6 border-2 border-border-strong border-t-accent rounded-full animate-spin"></div>
    </div>

    <div v-else-if="error" class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-4 flex flex-col sm:flex-row sm:items-center gap-2">
      <span class="flex-1">{{ error }}</span>
      <button @click="fetchLogEntries" class="underline hover:no-underline text-left sm:text-right">Reintentar</button>
    </div>

    <div v-else-if="filteredEntries.length === 0" class="text-center py-12">
      <svg class="w-12 h-12 mx-auto text-text-disabled mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p class="text-text-muted text-sm">
        {{ activeFilter === 'all'
          ? 'No hay actividades. Crea una para empezar.'
          : 'No hay actividades en esta categoría.'
        }}
      </p>
    </div>

    <div v-else class="space-y-3">
      <LogEntryCard
        v-for="entry in filteredEntries"
        :key="entry.id"
        :entry="entry"
        @edit="openEditModal"
        @delete="handleDelete"
        @status-change="handleStatusChange"
        @add-note="openAddNote"
        @edit-note="openEditNote"
        @delete-note="handleDeleteNote"
      />
    </div>

    <LogEntryModal
      :is-open="showModal"
      :entry="editingEntry"
      @close="closeModal"
      @saved="closeModal"
    />

    <NoteModal
      :is-open="noteModalOpen"
      :note="editingNote"
      :log-entry-id="noteTargetEntry?.id ?? null"
      @close="closeNoteModal"
      @saved="closeNoteModal"
    />
  </div>
</template>
