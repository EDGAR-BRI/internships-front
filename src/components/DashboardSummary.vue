<script setup lang="ts">
import { computed } from 'vue'
import { useLogEntries } from '../composables/useLogEntries'
import { useNotes } from '../composables/useNotes'
import LogEntryList from './LogEntryList.vue'
import NotesList from './NotesList.vue'

const { logEntries } = useLogEntries()
const { notes } = useNotes()

const stats = computed(() => {
  const entries = logEntries.value
  const allNotes = notes.value
  return {
    totalActivities: entries.length,
    pending: entries.filter((e) => e.status === 'pending').length,
    inProgress: entries.filter((e) => e.status === 'in_progress').length,
    done: entries.filter((e) => e.status === 'done').length,
    totalNotes: allNotes.length,
  }
})

const statCards = computed(() => [
  { label: 'Actividades', value: stats.value.totalActivities, color: 'text-text' },
  { label: 'Pendientes', value: stats.value.pending, color: 'text-neutral-400' },
  { label: 'En curso', value: stats.value.inProgress, color: 'text-warning' },
  { label: 'Terminadas', value: stats.value.done, color: 'text-accent' },
  { label: 'Notas', value: stats.value.totalNotes, color: 'text-text' },
])
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Resumen</h1>
        <p class="text-text-muted text-sm mt-1">Vista general de tu progreso</p>
      </div>
      <a
        href="/bitacora"
        class="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 flex items-center justify-center gap-2 w-full sm:w-auto"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        Ir a bitácora
      </a>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <div
        v-for="card in statCards"
        :key="card.label"
        class="bg-surface border border-border rounded-xl p-4 flex flex-col items-start"
      >
        <span class="text-[11px] font-medium text-text-muted uppercase tracking-wider">{{ card.label }}</span>
        <span class="text-2xl font-bold mt-1" :class="card.color">{{ card.value }}</span>
      </div>
    </div>

    <!-- Recent Activities -->
    <div>
      <LogEntryList
        title="Actividades recientes"
        :limit="5"
        :enable-search="false"
        :enable-date-filter="false"
        :enable-view-toggle="false"
      />
      <div class="mt-3 text-right">
        <a href="/bitacora?tab=activities" class="text-sm text-accent hover:text-accent-hover transition-colors inline-flex items-center gap-1">
          Ver todas las actividades
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>
    </div>

    <!-- Recent Notes -->
    <div>
      <NotesList
        title="Notas recientes"
        mode="all"
        :limit="5"
        :enable-search="false"
        :enable-date-filter="false"
      />
      <div class="mt-3 text-right">
        <a href="/bitacora?tab=notes" class="text-sm text-accent hover:text-accent-hover transition-colors inline-flex items-center gap-1">
          Ver todas las notas
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>
    </div>
  </div>
</template>
