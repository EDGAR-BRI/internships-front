<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/useAuth'
import { initSyncQueue, flushQueue, syncState } from '../lib/syncQueue'

const offline = ref(false)
const syncing = computed(() => syncState.flushing.value)
const pending = computed(() => syncState.pending.value.length)
const lastError = computed(() => syncState.lastError.value)
const lastSyncedAt = computed(() => syncState.lastSyncedAt.value)

let initDone = false

function update() {
  offline.value = !navigator.onLine
}

function onSynced() {
  const show = ref(false)
  show.value = true
  setTimeout(() => (show.value = false), 3000)
  return show
}

const justSynced = ref(false)

async function syncNow() {
  const auth = useAuthStore()
  const { sent } = await flushQueue(() => auth.token)
  if (sent > 0) {
    justSynced.value = true
    setTimeout(() => (justSynced.value = false), 4000)
  }
}

onMounted(() => {
  update()
  if (!initDone) {
    const auth = useAuthStore()
    initSyncQueue(() => auth.token)
    initDone = true
  }
  window.addEventListener('online', update)
  window.addEventListener('offline', update)
  window.addEventListener('sync-flushed', () => {
    justSynced.value = true
    setTimeout(() => (justSynced.value = false), 4000)
  })
})

onUnmounted(() => {
  window.removeEventListener('online', update)
  window.removeEventListener('offline', update)
})
</script>

<template>
  <div
    v-if="offline || pending > 0 || justSynced"
    class="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-[80] rounded-md px-4 py-2.5 flex items-center gap-3 shadow-lg backdrop-blur-sm"
    :class="
      offline || pending > 0
        ? 'bg-warning/15 border border-warning/30 text-warning'
        : 'bg-accent/15 border border-accent/30 text-accent'
    "
    role="status"
  >
    <svg v-if="!syncing" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        v-if="offline"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.242 4.242a5 5 0 010-7.072m0 0L4.929 9.879M8.464 15.536L6.05 17.95M6.05 17.95L3 21m3.929-3.05l2.121-2.121"
      />
      <path
        v-else-if="pending > 0"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
      <path
        v-else
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M5 13l4 4L19 7"
      />
    </svg>
    <svg v-else class="w-4 h-4 shrink-0 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
    <span class="text-sm">
      <template v-if="offline && pending > 0">
        Sin conexión · {{ pending }} {{ pending === 1 ? 'cambio' : 'cambios' }} por sincronizar
      </template>
      <template v-else-if="offline">
        Sin conexión — los datos ya cargados siguen disponibles
      </template>
      <template v-else-if="pending > 0">
        {{ pending }} {{ pending === 1 ? 'cambio' : 'cambios' }} guardados sin conexión
      </template>
      <template v-else-if="justSynced">Sincronizado correctamente</template>
    </span>
    <button
      v-if="(offline || pending > 0) && !syncing"
      class="text-xs font-medium underline underline-offset-2 hover:opacity-80 transition-opacity"
      @click="syncNow"
    >
      {{ offline ? 'Reintentar' : 'Sincronizar' }}
    </button>
  </div>
</template>
