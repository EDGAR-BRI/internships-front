<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLogEntries, type LogEntry } from '../composables/useLogEntries'
import LogEntryCard from './LogEntryCard.vue'
import LogEntryModal from './LogEntryModal.vue'

const { logEntries, loading, error, fetchLogEntries, deleteLogEntry, updateLogEntry } = useLogEntries()

const showModal = ref(false)
const editingEntry = ref<LogEntry | null>(null)
const activeFilter = ref<'all' | LogEntry['status']>('all')
const confirmDeleteId = ref<number | null>(null)

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
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold tracking-tight">Actividades</h1>
      <button
        @click="openCreateModal"
        class="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 flex items-center justify-center gap-2 w-full sm:w-auto"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Nueva actividad
      </button>
    </div>

    <div class="flex items-center gap-1 border-b border-border overflow-x-auto">
      <button
        v-for="filter in filters"
        :key="filter.value"
        @click="activeFilter = filter.value"
        class="px-3 py-2 text-sm font-medium transition-colors relative whitespace-nowrap"
        :class="activeFilter === filter.value
          ? 'text-text'
          : 'text-text-muted hover:text-text-secondary'"
      >
        {{ filter.label }}
        <span
          v-if="entryCounts[filter.value] > 0"
          class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-overlay"
        >
          {{ entryCounts[filter.value] }}
        </span>
        <div
          v-if="activeFilter === filter.value"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
        ></div>
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
      />
    </div>

    <LogEntryModal
      :is-open="showModal"
      :entry="editingEntry"
      @close="closeModal"
      @saved="closeModal"
    />
  </div>
</template>
