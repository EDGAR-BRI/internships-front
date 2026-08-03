<script setup lang="ts">
import { ref } from 'vue'
import type { Note } from '../composables/useNotes'

const props = defineProps<{
  note: Note
}>()

const emit = defineEmits<{
  edit: [note: Note]
  delete: [id: number]
}>()

const confirmDelete = ref(false)

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

function handleDelete() {
  if (confirmDelete.value) {
    emit('delete', props.note.id)
  } else {
    confirmDelete.value = true
    setTimeout(() => {
      confirmDelete.value = false
    }, 3000)
  }
}
</script>

<template>
  <div class="bg-overlay border border-border rounded-md p-3 flex items-start justify-between gap-3 transition-colors hover:border-border-strong">
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <span
          class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
          :class="note.logEntryId
            ? 'bg-accent/10 text-accent'
            : 'bg-warning/10 text-warning'"
        >
          {{ note.logEntryId ? 'Nota de actividad' : 'Individual' }}
        </span>
        <span class="inline-flex items-center text-[10px] gap-1 text-text-muted">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <template v-if="note.date">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </template>
            <template v-else>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </template>
          </svg>
          {{ formatDate(note.date || note.createdAt) }}
        </span>
      </div>
      <p class="text-sm text-text whitespace-pre-wrap break-words">{{ note.content }}</p>
    </div>

    <div class="flex items-center gap-1 flex-shrink-0">
      <button
        @click="emit('edit', note)"
        class="p-1.5 text-text-muted hover:text-text rounded transition-colors"
        title="Editar nota"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button
        @click="handleDelete"
        class="p-1.5 rounded transition-colors"
        :class="confirmDelete
          ? 'text-white bg-error hover:bg-error-hover'
          : 'text-text-muted hover:text-error'"
        :title="confirmDelete ? 'Confirmar eliminación' : 'Eliminar nota'"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  </div>
</template>
