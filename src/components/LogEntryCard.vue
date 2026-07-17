<script setup lang="ts">
import { ref } from 'vue'
import type { LogEntry } from '../composables/useLogEntries'

const props = defineProps<{
  entry: LogEntry
}>()

const emit = defineEmits<{
  edit: [entry: LogEntry]
  delete: [id: number]
  statusChange: [id: number, status: LogEntry['status']]
}>()

const deleting = ref(false)
const showDetails = ref(false)

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Terminada',
}

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: 'rgba(135,135,135,0.15)', text: '#a1a1a1', border: '#878787' },
  in_progress: { bg: 'rgba(245,166,35,0.15)', text: '#f5a623', border: '#f5a623' },
  done: { bg: 'rgba(0,112,243,0.15)', text: '#0070f3', border: '#0070f3' },
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

async function handleDelete() {
  if (deleting.value) return
  deleting.value = true
  emit('delete', props.entry.id)
}

function handleStatusToggle() {
  const newStatus = statusCycle[props.entry.status]
  emit('statusChange', props.entry.id, newStatus)
}

const hasDetails = props.entry.theory || props.entry.attitudes || props.entry.resources
</script>

<template>
  <div
    class="bg-surface border border-border rounded-lg p-4 transition-colors hover:border-border-strong"
    :style="{ borderLeftWidth: '3px', borderLeftColor: statusStyles[entry.status]?.border || '#878787' }"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <button
            @click="handleStatusToggle"
            class="flex-shrink-0 w-4 h-4 rounded border transition-colors"
            :class="entry.status === 'done'
              ? 'bg-accent border-accent'
              : 'border-border-strong hover:border-accent'"
            :title="`Cambiar estado: ${statusLabels[entry.status]}`"
          >
            <svg
              v-if="entry.status === 'done'"
              class="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <h3
            class="text-sm font-medium text-text"
            :class="{ 'line-through text-text-muted': entry.status === 'done' }"
          >
            {{ entry.name }}
          </h3>
        </div>

        <div class="flex items-center gap-2 ml-6 flex-wrap">
          <span
            class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
            :style="{
              backgroundColor: statusStyles[entry.status]?.bg || 'rgba(135,135,135,0.15)',
              color: statusStyles[entry.status]?.text || '#a1a1a1'
            }"
          >
            {{ statusLabels[entry.status] }}
          </span>

          <span v-if="entry.datStart" class="inline-flex items-center text-[10px] gap-1 text-text-muted">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {{ formatDate(entry.datStart) }}
          </span>

          <span v-if="entry.datEnd" class="inline-flex items-center text-[10px] gap-1 text-text-muted">
            → {{ formatDate(entry.datEnd) }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-1">
        <button
          v-if="hasDetails"
          @click="showDetails = !showDetails"
          class="p-1.5 text-text-muted hover:text-text rounded transition-colors"
          :title="showDetails ? 'Ocultar detalles' : 'Ver detalles'"
        >
          <svg
            class="w-4 h-4 transition-transform"
            :class="{ 'rotate-90': showDetails }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button
          @click="emit('edit', entry)"
          class="p-1.5 text-text-muted hover:text-text rounded transition-colors"
          title="Editar"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          @click="handleDelete"
          class="p-1.5 text-text-muted hover:text-error rounded transition-colors"
          title="Eliminar"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <Transition name="expand">
      <div v-if="showDetails && hasDetails" class="mt-3 ml-6 space-y-2">
        <div v-if="entry.theory" class="text-xs">
          <span class="font-medium text-text-secondary">Teoría:</span>
          <p class="text-text-muted mt-0.5 whitespace-pre-wrap">{{ entry.theory }}</p>
        </div>
        <div v-if="entry.attitudes" class="text-xs">
          <span class="font-medium text-text-secondary">Actitudes:</span>
          <p class="text-text-muted mt-0.5 whitespace-pre-wrap">{{ entry.attitudes }}</p>
        </div>
        <div v-if="entry.resources" class="text-xs">
          <span class="font-medium text-text-secondary">Recursos:</span>
          <p class="text-text-muted mt-0.5 whitespace-pre-wrap">{{ entry.resources }}</p>
        </div>
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
  max-height: 500px;
}
</style>
