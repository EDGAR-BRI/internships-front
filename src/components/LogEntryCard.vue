<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LogEntry } from '../composables/useLogEntries'
import { useNotes, type Note } from '../composables/useNotes'
import NoteCard from './NoteCard.vue'

const props = defineProps<{
  entry: LogEntry
  viewMode?: 'grid' | 'list'
}>()

const emit = defineEmits<{
  edit: [entry: LogEntry]
  delete: [id: number]
  statusChange: [id: number, status: LogEntry['status']]
  addNote: [entry: LogEntry]
  editNote: [note: Note]
  deleteNote: [id: number]
  viewNote: [note: Note]
  view: [entry: LogEntry]
}>()

const { notes } = useNotes()

const showNotes = ref(false)

const activityNotes = computed(() => notes.value.filter((n) => n.logEntryId === props.entry.id))

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

const statusBorderClasses: Record<string, string> = {
  pending: 'border-l-neutral-500',
  in_progress: 'border-l-warning',
  done: 'border-l-accent',
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
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  })
}

function handleDelete() {
  emit('delete', props.entry.id)
}

function handleStatusToggle() {
  const newStatus = statusCycle[props.entry.status]
  emit('statusChange', props.entry.id, newStatus)
}

const isGrid = computed(() => props.viewMode === 'grid')
</script>

<template>
  <div
    class="group relative bg-surface border border-border rounded-xl transition-all duration-200 hover:border-border-strong cursor-pointer overflow-hidden"
    :class="[
      isGrid ? 'p-5 border-l-[4px]' : 'p-4 border-l-[3px]',
      statusBorderClasses[entry.status] || 'border-l-neutral-500',
      isGrid ? 'flex flex-col h-full' : 'flex flex-col',
    ]"
    @click="emit('view', entry)"
  >
    <!-- ===== GRID LAYOUT ===== -->
    <template v-if="isGrid">
      <div class="flex items-start justify-between gap-3 mb-3">
        <span
          class="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium border"
          :class="statusPillClasses[entry.status]"
        >
          {{ statusLabels[entry.status] }}
        </span>

        <div class="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            @click.stop="emit('edit', entry)"
            class="p-1.5 text-text-muted hover:text-text rounded-md hover:bg-overlay transition-colors"
            title="Editar"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            @click.stop="handleDelete"
            class="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-md transition-colors"
            title="Eliminar"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div class="flex items-start gap-3 mb-3">
        <button
          @click.stop="handleStatusToggle"
          class="status-toggle-btn flex-shrink-0 w-6 h-6 rounded-md border transition-all flex items-center justify-center mt-0.5 hover:scale-110 active:scale-95 hover:ring-2 hover:ring-accent/40"
          :class="entry.status === 'done'
            ? 'bg-accent border-accent'
            : entry.status === 'in_progress'
              ? 'bg-warning/10 border-warning/60 hover:border-warning'
              : 'bg-neutral-500/10 border-neutral-500/60 hover:border-neutral-400'"
          :title="`Cambiar estado: ${statusLabels[entry.status]}`"
        >
          <svg
            v-if="entry.status === 'done'"
            class="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <svg
            v-else-if="entry.status === 'in_progress'"
            class="w-4 h-4 text-warning"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3" />
          </svg>
        </button>
        <h3
          class="flex-1 min-w-0 text-base font-semibold text-text leading-snug"
          :class="{ 'line-through text-text-muted': entry.status === 'done' }"
        >
          {{ entry.name }}
        </h3>
      </div>

      <div class="flex flex-wrap gap-2 mb-auto">
        <span
          v-if="entry.week"
          class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-overlay text-[11px] text-text-secondary border border-border"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Semana {{ entry.week }}
        </span>
        <span
          v-if="entry.area"
          class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-overlay text-[11px] text-text-secondary border border-border"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-6 0V9a2 2 0 00-2-2h-2a2 2 0 00-2 2v12" />
          </svg>
          {{ entry.area }}
        </span>
        <span
          v-if="entry.datStart"
          class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-overlay text-[11px] text-text-secondary border border-border"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {{ formatShortDate(entry.datStart) }}
          <template v-if="entry.datEnd">
            → {{ formatShortDate(entry.datEnd) }}
          </template>
        </span>
      </div>

      <div class="mt-4 pt-3 border-t border-border flex items-center justify-between">
        <span class="text-[11px] text-text-muted">
          {{ entry.datStart ? formatDate(entry.datStart) : '' }}
        </span>
        <div class="flex items-center gap-2">
          <button
            @click.stop="showNotes = !showNotes"
            class="flex items-center gap-1 text-[11px] text-text-secondary hover:text-text transition-colors px-2 py-1 rounded-md hover:bg-overlay"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Notas
            <span v-if="activityNotes.length" class="text-[10px] px-1.5 py-0.5 rounded-full bg-canvas text-text-secondary">
              {{ activityNotes.length }}
            </span>
          </button>
        </div>
      </div>
    </template>

    <!-- ===== LIST LAYOUT ===== -->
    <template v-else>
      <div class="flex items-center gap-3">
        <button
          @click.stop="handleStatusToggle"
          class="status-toggle-btn flex-shrink-0 w-5 h-5 rounded border transition-all flex items-center justify-center hover:scale-110 active:scale-95 hover:ring-2 hover:ring-accent/40"
          :class="entry.status === 'done'
            ? 'bg-accent border-accent'
            : entry.status === 'in_progress'
              ? 'bg-warning/10 border-warning/60 hover:border-warning'
              : 'bg-neutral-500/10 border-neutral-500/60 hover:border-neutral-400'"
          :title="`Cambiar estado: ${statusLabels[entry.status]}`"
        >
          <svg
            v-if="entry.status === 'done'"
            class="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <svg
            v-else-if="entry.status === 'in_progress'"
            class="w-4 h-4 text-warning"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3" />
          </svg>
        </button>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <h3
              class="text-sm font-semibold text-text leading-snug"
              :class="{ 'line-through text-text-muted': entry.status === 'done' }"
            >
              {{ entry.name }}
            </h3>
            <span
              class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0"
              :class="statusPillClasses[entry.status]"
            >
              {{ statusLabels[entry.status] }}
            </span>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <span v-if="entry.week" class="inline-flex items-center text-[11px] gap-1 text-text-muted">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Semana {{ entry.week }}
            </span>
            <span v-if="entry.area" class="inline-flex items-center text-[11px] gap-1 text-text-muted">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-6 0V9a2 2 0 00-2-2h-2a2 2 0 00-2 2v12" />
              </svg>
              {{ entry.area }}
            </span>
            <span v-if="entry.datStart" class="inline-flex items-center text-[11px] gap-1 text-text-muted">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {{ formatDate(entry.datStart) }}
            </span>
            <span v-if="entry.datEnd" class="inline-flex items-center text-[11px] gap-1 text-text-muted">
              → {{ formatDate(entry.datEnd) }}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-1 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            @click.stop="emit('edit', entry)"
            class="p-1.5 text-text-muted hover:text-text rounded-md hover:bg-overlay transition-colors"
            title="Editar"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            @click.stop="handleDelete"
            class="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-md transition-colors"
            title="Eliminar"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div class="mt-2 ml-8 flex items-center gap-2">
        <button
          @click.stop="showNotes = !showNotes"
          class="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text transition-colors py-1"
        >
          <svg
            class="w-3.5 h-3.5 transition-transform duration-200"
            :class="{ 'rotate-90': showNotes }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          Notas
          <span v-if="activityNotes.length" class="text-[10px] px-1.5 py-0.5 rounded-full bg-overlay">
            {{ activityNotes.length }}
          </span>
        </button>
        <button
          @click.stop="emit('addNote', entry)"
          class="text-xs text-accent hover:text-accent-hover transition-colors py-1"
        >
          + Agregar nota
        </button>
      </div>
    </template>

    <!-- ===== EXPANDABLE NOTES ===== -->
    <Transition name="expand">
      <div
        v-if="showNotes"
        class="space-y-2"
        :class="isGrid ? 'mt-3' : 'mt-2 ml-8'"
      >
        <p v-if="activityNotes.length === 0" class="text-xs text-text-muted">
          Sin notas para esta actividad.
        </p>
        <NoteCard
          v-for="note in activityNotes"
          :key="note.id"
          :note="note"
          @view="emit('viewNote', $event)"
          @edit="emit('editNote', $event)"
          @delete="emit('deleteNote', $event)"
        />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 600px;
}

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
