<script setup lang="ts">
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { useNotes, type Note } from '../composables/useNotes'
import { useLogEntries, type LogEntry } from '../composables/useLogEntries'
import { NOTE_TAGS } from '../utils/noteTags'
import NoteCard from './NoteCard.vue'

const NoteModal = defineAsyncComponent(() => import('./NoteModal.vue'))
const LogEntryDetailModal = defineAsyncComponent(() => import('./LogEntryDetailModal.vue'))

const props = defineProps<{
  title?: string
  mode?: 'standalone' | 'all'
  limit?: number
  enableSearch?: boolean
  enableDateFilter?: boolean
}>()

const { notes, loading, error, fetchNotes, deleteNote } = useNotes()
const { logEntries, fetchLogEntries } = useLogEntries()

const showModal = ref(false)
const editingNote = ref<Note | null>(null)
const viewOnly = ref(false)

const showDetailModal = ref(false)
const viewingEntry = ref<LogEntry | null>(null)

const searchQuery = ref('')
const dateFilter = ref<'all' | 'today' | 'week' | 'month'>('all')
const noteTypeFilter = ref<'all' | 'standalone' | 'activity'>('all')
const tagFilter = ref<string>('all')

const filteredNotes = computed(() => {
  let result = notes.value

  if (props.mode === 'standalone') {
    result = result.filter((n) => !n.logEntryId)
  }

  if (noteTypeFilter.value === 'standalone') {
    result = result.filter((n) => !n.logEntryId)
  } else if (noteTypeFilter.value === 'activity') {
    result = result.filter((n) => n.logEntryId)
  }

  if (tagFilter.value !== 'all') {
    result = result.filter((n) => n.tag === tagFilter.value)
  }

  if (props.enableSearch && searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(
      (n) =>
        (n.title?.toLowerCase().includes(q) ?? false) ||
        n.content.toLowerCase().includes(q)
    )
  }

  if (props.enableDateFilter && dateFilter.value !== 'all') {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    result = result.filter((n) => {
      const d = new Date(n.date || n.createdAt)
      if (dateFilter.value === 'today') {
        return d >= today
      } else if (dateFilter.value === 'week') {
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return d >= weekAgo
      } else if (dateFilter.value === 'month') {
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return d >= monthAgo
      }
      return true
    })
  }

  if (props.limit) {
    result = result.slice(0, props.limit)
  }

  return result
})

onMounted(() => {
  fetchNotes()
  if (logEntries.value.length === 0) {
    fetchLogEntries()
  }
})

function openCreateModal() {
  editingNote.value = null
  viewOnly.value = false
  showModal.value = true
}

function openEditModal(note: Note) {
  editingNote.value = note
  viewOnly.value = false
  showModal.value = true
}

function openViewModal(note: Note) {
  editingNote.value = note
  viewOnly.value = true
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingNote.value = null
  viewOnly.value = false
}

async function handleDelete(id: number) {
  await deleteNote(id)
}

function openViewActivity(logEntryId: number) {
  const entry = logEntries.value.find((e) => e.id === logEntryId) ?? null
  viewingEntry.value = entry
  showDetailModal.value = true
}

function closeDetailModal() {
  showDetailModal.value = false
  viewingEntry.value = null
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <h2 class="text-lg font-semibold tracking-tight">{{ props.title ?? 'Notas' }}</h2>
      <button
        @click="openCreateModal"
        class="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 flex items-center justify-center gap-2 w-full sm:w-auto"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Nueva nota
      </button>
    </div>

    <div v-if="props.enableSearch || props.enableDateFilter || props.mode === 'all'" class="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
      <div v-if="props.enableSearch" class="relative flex-1">
        <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQuery"
          placeholder="Buscar notas..."
          class="w-full bg-overlay border border-border rounded-md pl-9 pr-3 py-2 text-sm text-text placeholder:text-text-disabled focus:outline-none focus:border-accent transition-colors"
        />
      </div>
      <div class="flex items-center gap-2">
        <select
          v-if="props.mode === 'all'"
          v-model="noteTypeFilter"
          class="bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent transition-colors"
        >
          <option value="all">Todas las notas</option>
          <option value="standalone">Individuales</option>
          <option value="activity">De actividades</option>
        </select>
        <select
          v-if="props.enableDateFilter"
          v-model="dateFilter"
          class="bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent transition-colors"
        >
          <option value="all">Todas las fechas</option>
          <option value="today">Hoy</option>
          <option value="week">Esta semana</option>
          <option value="month">Este mes</option>
        </select>
      </div>
    </div>

    <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
      <button
        @click="tagFilter = 'all'"
        class="px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors"
        :class="tagFilter === 'all'
          ? 'bg-accent text-white'
          : 'bg-overlay text-text-muted hover:text-text-secondary hover:bg-hover'"
      >
        Todas
      </button>
      <button
        v-for="t in NOTE_TAGS"
        :key="t.value"
        @click="tagFilter = t.value"
        class="px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors"
        :class="tagFilter === t.value
          ? 'bg-accent text-white'
          : 'bg-overlay text-text-muted hover:text-text-secondary hover:bg-hover'"
      >
        {{ t.label }}
      </button>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="w-6 h-6 border-2 border-border-strong border-t-accent rounded-full animate-spin"></div>
    </div>

    <div
      v-else-if="error"
      class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-4 flex flex-col sm:flex-row sm:items-center gap-2"
    >
      <span class="flex-1">{{ error }}</span>
      <button @click="fetchNotes" class="underline hover:no-underline text-left sm:text-right">Reintentar</button>
    </div>

    <div v-else-if="filteredNotes.length === 0" class="text-center py-8">
      <svg class="w-10 h-10 mx-auto text-text-disabled mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
      <p class="text-text-muted text-sm">No hay notas. Crea una para empezar.</p>
    </div>

    <div v-else class="space-y-2">
      <NoteCard
        v-for="note in filteredNotes"
        :key="note.id"
        :note="note"
        @view="openViewModal"
        @edit="openEditModal"
        @delete="handleDelete"
        @view-activity="openViewActivity"
      />
    </div>

    <NoteModal
      :is-open="showModal"
      :note="editingNote"
      :log-entry-id="null"
      :view-only="viewOnly"
      @close="closeModal"
      @saved="closeModal"
    />

    <LogEntryDetailModal
      :is-open="showDetailModal"
      :entry="viewingEntry"
      @close="closeDetailModal"
    />
  </div>
</template>
