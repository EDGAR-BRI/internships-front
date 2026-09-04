<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useLogEntries, type LogEntry } from '../composables/useLogEntries'
import { useNotes, type Note } from '../composables/useNotes'
import LogEntryCard from './LogEntryCard.vue'
import LogEntryModal from './LogEntryModal.vue'
import LogEntryDetailModal from './LogEntryDetailModal.vue'
import NoteModal from './NoteModal.vue'

const props = defineProps<{
  title?: string
  limit?: number
  enableSearch?: boolean
  enableDateFilter?: boolean
  enableViewToggle?: boolean
}>()

const { logEntries, loading, error, fetchLogEntries, deleteLogEntry, updateLogEntry } = useLogEntries()
const { notes, deleteNote } = useNotes()

const showModal = ref(false)
const editingEntry = ref<LogEntry | null>(null)
const activeFilter = ref<'all' | LogEntry['status']>('all')
const confirmDeleteId = ref<number | null>(null)

const showDetailModal = ref(false)
const viewingId = ref<number | null>(null)
const viewingEntry = computed<LogEntry | null>(() =>
  viewingId.value !== null
    ? (logEntries.value.find((e) => e.id === viewingId.value) ?? null)
    : null
)

const noteModalOpen = ref(false)
const noteTargetEntry = ref<LogEntry | null>(null)
const editingNote = ref<Note | null>(null)
const noteViewOnly = ref(false)

const searchQuery = ref('')
const dateFilter = ref<'all' | 'today' | 'week' | 'month'>('all')
const selectedDate = ref('')
const viewMode = ref<'grid' | 'list'>('list')

watch(dateFilter, (v) => {
  if (v !== 'all') selectedDate.value = ''
})
watch(selectedDate, (v) => {
  if (v) dateFilter.value = 'all'
})

const filters: { value: 'all' | LogEntry['status']; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'done', label: 'Terminadas' },
]

const filteredEntries = computed(() => {
  let result = logEntries.value

  if (activeFilter.value !== 'all') {
    result = result.filter((t) => t.status === activeFilter.value)
  }

  if (props.enableSearch && searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter((t) => {
      const matchesEntry =
        t.name.toLowerCase().includes(q) ||
        (t.area?.toLowerCase().includes(q) ?? false) ||
        (t.theory?.toLowerCase().includes(q) ?? false) ||
        (t.impact?.toLowerCase().includes(q) ?? false) ||
        (t.resources?.toLowerCase().includes(q) ?? false)
      const matchesNotes = notes.value
        .filter((n) => n.logEntryId === t.id)
        .some(
          (n) =>
            (n.title?.toLowerCase().includes(q) ?? false) ||
            n.content.toLowerCase().includes(q)
        )
      return matchesEntry || matchesNotes
    })
  }

  if (props.enableDateFilter && selectedDate.value) {
    const [y, m, d] = selectedDate.value.split('-').map(Number)
    const dayStart = new Date(y, m - 1, d)
    const dayEnd = new Date(y, m - 1, d + 1)
    result = result.filter((t) => {
      const start = new Date(t.datStart || t.createdAt)
      const end = t.datEnd ? new Date(t.datEnd) : null
      return start < dayEnd && (end === null || end > dayStart)
    })
  }

  if (props.enableDateFilter && dateFilter.value !== 'all') {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    result = result.filter((t) => {
      const d = new Date(t.datStart || t.createdAt)
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

function openViewDetail(entry: LogEntry) {
  viewingId.value = entry.id
  showDetailModal.value = true
}

function closeDetailModal() {
  showDetailModal.value = false
  viewingId.value = null
}

async function handleDelete(id: number) {
  if (confirmDeleteId.value === id) {
    await deleteLogEntry(id)
    confirmDeleteId.value = null
    if (viewingId.value === id) closeDetailModal()
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
  const data: Partial<import('../composables/useLogEntries').LogEntryFormData> = { status }
  if (status === 'done') {
    const now = new Date()
    const offset = now.getTimezoneOffset()
    const local = new Date(now.getTime() - offset * 60000)
    data.datEnd = local.toISOString().slice(0, 16)
  }
  await updateLogEntry(id, data)
}

function openAddNote(entry: LogEntry) {
  editingNote.value = null
  noteTargetEntry.value = entry
  noteViewOnly.value = false
  noteModalOpen.value = true
}

function openEditNote(note: Note) {
  editingNote.value = note
  noteTargetEntry.value = null
  noteViewOnly.value = false
  noteModalOpen.value = true
}

function openViewNote(note: Note) {
  editingNote.value = note
  noteTargetEntry.value = null
  noteViewOnly.value = true
  noteModalOpen.value = true
}

function closeNoteModal() {
  noteModalOpen.value = false
  noteTargetEntry.value = null
  editingNote.value = null
  noteViewOnly.value = false
}

async function handleDeleteNote(id: number) {
  await deleteNote(id)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold tracking-tight">{{ props.title ?? 'Actividades' }}</h1>
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
          Actividad
        </button>
      </div>
    </div>

    <div v-if="props.enableSearch || props.enableDateFilter || props.enableViewToggle" class="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
      <div v-if="props.enableSearch" class="relative flex-1">
        <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQuery"
          placeholder="Buscar actividades..."
          class="w-full bg-overlay border border-border rounded-md pl-9 pr-3 py-2 text-sm text-text placeholder:text-text-disabled focus:outline-none focus:border-accent transition-colors"
        />
      </div>
      <div class="flex items-center gap-2">
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
        <input
          v-if="props.enableDateFilter"
          v-model="selectedDate"
          type="date"
          title="Filtrar por día"
          class="bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent transition-colors"
        />
        <div v-if="props.enableViewToggle" class="flex items-center gap-1 bg-overlay border border-border rounded-md p-0.5">
          <button
            @click="viewMode = 'grid'"
            class="p-1.5 rounded transition-colors"
            :class="viewMode === 'grid' ? 'bg-accent text-white' : 'text-text-muted hover:text-text'"
            title="Vista mosaico"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            @click="viewMode = 'list'"
            class="p-1.5 rounded transition-colors"
            :class="viewMode === 'list' ? 'bg-accent text-white' : 'text-text-muted hover:text-text'"
            title="Vista lista"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
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
          ? (selectedDate
              ? 'No hay actividades para ese día.'
              : 'No hay actividades. Crea una para empezar.')
          : 'No hay actividades en esta categoría.'
        }}
      </p>
    </div>

    <div
      v-else
      :class="viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'"
    >
      <LogEntryCard
        v-for="entry in filteredEntries"
        :key="entry.id"
        :entry="entry"
        :view-mode="viewMode"
        @view="openViewDetail"
        @edit="openEditModal"
        @delete="handleDelete"
        @status-change="handleStatusChange"
        @add-note="openAddNote"
        @edit-note="openEditNote"
        @view-note="openViewNote"
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
      :view-only="noteViewOnly"
      @close="closeNoteModal"
      @saved="closeNoteModal"
    />

    <LogEntryDetailModal
      :is-open="showDetailModal"
      :entry="viewingEntry"
      @close="closeDetailModal"
      @edit="openEditModal"
      @delete="handleDelete"
      @status-change="handleStatusChange"
      @add-note="openAddNote"
      @edit-note="openEditNote"
      @view-note="openViewNote"
      @delete-note="handleDeleteNote"
    />
  </div>
</template>
