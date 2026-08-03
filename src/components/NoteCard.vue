<script setup lang="ts">
import { ref } from 'vue'
import type { Note } from '../composables/useNotes'

const props = defineProps<{
  note: Note
}>()

const emit = defineEmits<{
  view: [note: Note]
  edit: [note: Note]
  delete: [id: number]
  viewActivity: [logEntryId: number]
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
  <div
    class="group relative bg-surface border border-border rounded-lg p-4 transition-all duration-150 cursor-pointer hover:border-border-strong hover:bg-raised"
    @click="emit('view', note)"
  >
    <div class="flex items-start justify-between gap-3 mb-2">
      <div class="flex items-center gap-2 flex-wrap">
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
      <div class="flex items-center gap-1 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          @click.stop="emit('edit', note)"
          class="p-1.5 text-text-muted hover:text-text rounded transition-colors"
          title="Editar nota"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          @click.stop="handleDelete"
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

    <h3 v-if="note.title" class="text-sm font-semibold text-text mb-1 leading-snug line-clamp-1">
      {{ note.title }}
    </h3>
    <p class="text-sm text-text line-clamp-3 whitespace-pre-wrap break-words leading-relaxed">
      {{ note.content }}
    </p>

    <div class="mt-2 flex items-center justify-between">
      <div class="flex items-center gap-1 text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity sm:flex">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Ver detalle
      </div>
      <button
        v-if="note.logEntryId"
        @click.stop="emit('viewActivity', note.logEntryId)"
        class="text-[10px] text-accent hover:text-accent-hover transition-colors flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        Ver actividad
      </button>
    </div>
  </div>
</template>
