<script setup lang="ts">
import { computed } from 'vue'
import type { LogEntry } from '../composables/useLogEntries'
import { useNotes, type Note } from '../composables/useNotes'
import NoteCard from './NoteCard.vue'

const props = defineProps<{
  entry: LogEntry | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  edit: [entry: LogEntry]
  delete: [id: number]
  statusChange: [id: number, status: LogEntry['status']]
  addNote: [entry: LogEntry]
  editNote: [note: Note]
  deleteNote: [id: number]
  viewNote: [note: Note]
}>()

const { notes } = useNotes()

const activityNotes = computed(() =>
  props.entry ? notes.value.filter((n) => n.logEntryId === props.entry!.id) : []
)

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Terminada',
}

const statusPillClasses: Record<string, string> = {
  pending: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
  in_progress: 'bg-warning/10 text-warning border-warning/20',
  done: 'bg-accent/10 text-accent border-accent/20',
}

const statusCycle: Record<string, LogEntry['status']> = {
  pending: 'in_progress',
  in_progress: 'done',
  done: 'pending',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function handleStatusToggle() {
  if (!props.entry) return
  const newStatus = statusCycle[props.entry.status]
  emit('statusChange', props.entry.id, newStatus)
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}
</script>

<template>
  <div
      v-if="isOpen && entry"
        class="fixed inset-0 z-[55] flex items-center justify-center p-4"
        @click="handleBackdropClick"
      >
        <div class="absolute inset-0 bg-black/60" />

        <div
          class="relative bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto modal-open"
          @click.stop
        >
          <!-- Header -->
          <div class="sticky top-0 z-10 bg-surface border-b border-border">
            <div class="relative p-6">
              <div class="flex items-center gap-2 mb-2 pr-10">
                <button
                  @click="handleStatusToggle"
                  class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition-all hover:scale-105 active:scale-95 hover:ring-2 hover:ring-accent/40"
                  :class="[entry.status !== 'done' ? 'status-toggle-btn' : '', statusPillClasses[entry.status]]"
                  :title="`Cambiar estado: ${statusLabels[entry.status]}`"
                >
                  <svg
                    v-if="entry.status === 'done'"
                    class="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg
                    v-else-if="entry.status === 'in_progress'"
                    class="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3" />
                  </svg>
                  <svg
                    v-else
                    class="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {{ statusLabels[entry.status] }}
                </button>
                <span v-if="entry.week" class="text-[11px] text-text-muted">
                  Semana {{ entry.week }}
                </span>
                <button
                  @click="emit('addNote', entry)"
                  class="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:text-accent-hover transition-colors"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Nota
                </button>
              </div>
              <h2
                class="w-full text-xl font-semibold text-text leading-snug break-words pr-10"
                :class="{ 'line-through text-text-muted': entry.status === 'done' }"
              >
                {{ entry.name }}
              </h2>
            </div>
            <button
              @click="emit('close')"
              class="absolute top-4 right-4 p-2 text-text-muted hover:text-text hover:bg-overlay rounded-lg transition-colors flex-shrink-0"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 space-y-6">
            <!-- Meta grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div v-if="entry.area" class="flex items-start gap-3">
                <div class="p-2 bg-overlay rounded-lg">
                  <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-6 0V9a2 2 0 00-2-2h-2a2 2 0 00-2 2v12" />
                  </svg>
                </div>
                <div>
                  <p class="text-[11px] font-medium text-text-muted uppercase tracking-wider">Área</p>
                  <p class="text-sm text-text mt-0.5">{{ entry.area }}</p>
                </div>
              </div>

              <div v-if="entry.datStart" class="flex items-start gap-3">
                <div class="p-2 bg-overlay rounded-lg">
                  <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p class="text-[11px] font-medium text-text-muted uppercase tracking-wider">Inicio</p>
                  <p class="text-sm text-text mt-0.5">{{ formatDate(entry.datStart) }}</p>
                </div>
              </div>

              <div v-if="entry.datEnd" class="flex items-start gap-3">
                <div class="p-2 bg-overlay rounded-lg">
                  <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p class="text-[11px] font-medium text-text-muted uppercase tracking-wider">Fin</p>
                  <p class="text-sm text-text mt-0.5">{{ formatDate(entry.datEnd) }}</p>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <div class="p-2 bg-overlay rounded-lg">
                  <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p class="text-[11px] font-medium text-text-muted uppercase tracking-wider">Creado</p>
                  <p class="text-sm text-text mt-0.5">{{ formatDate(entry.createdAt) }}</p>
                </div>
              </div>
            </div>

            <!-- Sections -->
            <div v-if="entry.theory" class="space-y-2">
              <h3 class="text-sm font-semibold text-text flex items-center gap-2">
                <svg class="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Teoría
              </h3>
              <div class="bg-overlay border border-border rounded-xl p-4">
                <p class="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{{ entry.theory }}</p>
              </div>
            </div>

            <div v-if="entry.impact" class="space-y-2">
              <h3 class="text-sm font-semibold text-text flex items-center gap-2">
                <svg class="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Impacto
              </h3>
              <div class="bg-overlay border border-border rounded-xl p-4">
                <p class="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{{ entry.impact }}</p>
              </div>
            </div>

            <div v-if="entry.resources" class="space-y-2">
              <h3 class="text-sm font-semibold text-text flex items-center gap-2">
                <svg class="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Otros elementos
              </h3>
              <div class="bg-overlay border border-border rounded-xl p-4">
                <p class="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{{ entry.resources }}</p>
              </div>
            </div>

            <!-- Notes -->
            <div v-if="activityNotes.length > 0" class="space-y-3">
              <h3 class="text-sm font-semibold text-text flex items-center gap-2">
                <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Notas de la actividad
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-overlay text-text-secondary">
                  {{ activityNotes.length }}
                </span>
              </h3>
              <div class="space-y-2">
                <NoteCard
                  v-for="note in activityNotes"
                  :key="note.id"
                  :note="note"
                  @view="emit('viewNote', $event)"
                  @edit="emit('editNote', $event)"
                  @delete="emit('deleteNote', $event)"
                />
              </div>
            </div>
          </div>

          <!-- Footer actions -->
          <div class="flex flex-wrap items-center justify-end gap-3 p-6 border-t border-border">
            <div class="flex items-center gap-2 w-full sm:w-auto">
              <button
                @click="emit('edit', entry)"
                class="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium bg-overlay hover:bg-hover text-text-secondary hover:text-text transition-colors"
              >
                Editar
              </button>
              <button
                @click="emit('delete', entry.id)"
                class="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium bg-overlay hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
    </div>
</template>

<style scoped>
@keyframes status-vibrate {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-2px) rotate(-4deg);
  }
  40% {
    transform: translateX(2px) rotate(4deg);
  }
  60% {
    transform: translateX(-2px) rotate(-3deg);
  }
  80% {
    transform: translateX(2px) rotate(3deg);
  }
}

.status-toggle-btn {
  animation: status-vibrate 0.45s ease-in-out 2;
  animation-delay: 0.4s;
  cursor: pointer;
}
</style>
