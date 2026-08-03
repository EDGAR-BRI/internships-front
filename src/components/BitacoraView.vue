<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LogEntryList from './LogEntryList.vue'
import NotesList from './NotesList.vue'

const activeTab = ref<'activities' | 'notes'>('activities')

const tabs = [
  { value: 'activities' as const, label: 'Actividades' },
  { value: 'notes' as const, label: 'Notas' },
]

onMounted(() => {
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
  </div>
</template>
