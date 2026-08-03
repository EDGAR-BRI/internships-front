<script setup lang="ts">
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { useNotes, type Note } from '../composables/useNotes'
import NoteCard from './NoteCard.vue'

const NoteModal = defineAsyncComponent(() => import('./NoteModal.vue'))

const { notes, loading, error, fetchNotes, deleteNote } = useNotes()

const showModal = ref(false)
const editingNote = ref<Note | null>(null)
const viewOnly = ref(false)

const standaloneNotes = computed(() => notes.value.filter((n) => !n.logEntryId))

onMounted(() => {
  fetchNotes()
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
</script>

<template>
  <div class="space-y-4 mt-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <h2 class="text-lg font-semibold tracking-tight">Notas</h2>
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

    <div v-else-if="standaloneNotes.length === 0" class="text-center py-8">
      <svg class="w-10 h-10 mx-auto text-text-disabled mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
      <p class="text-text-muted text-sm">No hay notas individuales. Crea una para empezar.</p>
    </div>

    <div v-else class="space-y-2">
      <NoteCard
        v-for="note in standaloneNotes"
        :key="note.id"
        :note="note"
        @view="openViewModal"
        @edit="openEditModal"
        @delete="handleDelete"
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
  </div>
</template>
