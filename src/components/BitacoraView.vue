<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import LogEntryList from './LogEntryList.vue'
import NotesList from './NotesList.vue'
import ImportBitacoraModal from './ImportBitacoraModal.vue'
import { useLogEntries } from '../composables/useLogEntries'
import { useNotes } from '../composables/useNotes'
import { useSubscription } from '../composables/useSubscription'
import { buildMarkdown, downloadMarkdown } from '../utils/exportMarkdown'

const activeTab = ref<'activities' | 'notes'>('activities')
const exporting = ref(false)
const importModalOpen = ref(false)

const { logEntries, fetchLogEntries, error: logEntriesError } = useLogEntries()
const { notes, fetchNotes, error: notesError } = useNotes()
const { mySubscription, fetchMySubscription } = useSubscription()

const canExport = computed(() => mySubscription.value?.canExport ?? true)

async function handleExport() {
  if (!canExport.value) {
    window.dispatchEvent(
      new CustomEvent('upgrade-offer', {
        detail: {
          message:
            'La exportación de la bitácora está disponible en el plan Pro. Actualiza por $3 (pago único) para exportar tus actividades y notas.',
        },
      })
    )
    return
  }
  if (exporting.value) return
  exporting.value = true
  try {
    await Promise.all([fetchLogEntries(), fetchNotes()])
    if (logEntriesError.value || notesError.value) {
      throw new Error(logEntriesError.value || notesError.value)
    }
    downloadMarkdown(buildMarkdown(logEntries.value, notes.value))
  } catch (e) {
    console.error('Error al exportar la bitácora', e)
  } finally {
    exporting.value = false
  }
}

const tabs = [
  { value: 'activities' as const, label: 'Actividades' },
  { value: 'notes' as const, label: 'Notas' },
]

onMounted(() => {
  fetchMySubscription()
  const params = new URLSearchParams(window.location.search)
  const tab = params.get('tab')
  if (tab === 'notes') {
    activeTab.value = 'notes'
  } else if (tab === 'activities') {
    activeTab.value = 'activities'
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Bitácora</h1>
        <p class="text-text-muted text-sm mt-1">Todas tus actividades y notas en un solo lugar</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="importModalOpen = true"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-overlay text-text-secondary hover:text-text hover:bg-hover transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Importar
        </button>
        <button
          @click="handleExport"
          :disabled="exporting"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {{ exporting ? 'Exportando…' : 'Exportar .md' }}
        </button>
      </div>
    </div>

    <div class="flex items-center gap-2 border-b border-border pb-2">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="activeTab = tab.value"
        class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors"
        :class="activeTab === tab.value
          ? 'bg-accent text-white'
          : 'bg-overlay text-text-muted hover:text-text-secondary hover:bg-hover'"
      >
        <svg
          v-if="tab.value === 'activities'"
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <svg
          v-else
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        {{ tab.label }}
      </button>
    </div>

    <div v-if="activeTab === 'activities'">
      <LogEntryList
        :enable-search="true"
        :enable-date-filter="true"
        :enable-view-toggle="true"
      />
    </div>

    <div v-else>
      <NotesList
        mode="all"
        :enable-search="true"
        :enable-date-filter="true"
      />
    </div>

    <ImportBitacoraModal
      :is-open="importModalOpen"
      @close="importModalOpen = false"
    />
  </div>
</template>
