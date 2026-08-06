<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const offline = ref(false)

function update() {
  offline.value = !navigator.onLine
}

onMounted(() => {
  update()
  window.addEventListener('online', update)
  window.addEventListener('offline', update)
})

onUnmounted(() => {
  window.removeEventListener('online', update)
  window.removeEventListener('offline', update)
})
</script>

<template>
  <div
    v-if="offline"
    class="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-[80] bg-warning/15 border border-warning/30 text-warning text-sm rounded-md px-4 py-2 flex items-center gap-2 shadow-lg backdrop-blur-sm"
    role="status"
  >
    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.242 4.242a5 5 0 010-7.072m0 0L4.929 9.879M8.464 15.536L6.05 17.95M6.05 17.95L3 21m3.929-3.05l2.121-2.121"
      />
    </svg>
    Sin conexión — los datos ya cargados siguen disponibles
  </div>
</template>
