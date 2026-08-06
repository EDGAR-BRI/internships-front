<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import RubikLoader from './RubikLoader.vue'

const { restoreSession, loadFromStorage, isAuthenticated } = useAuth()
const ready = ref(false)

const MIN_LOADER_MS = 500

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

onMounted(async () => {
  const started = Date.now()

  // 1. Restaurar sesión sincrónicamente desde localStorage
  const hasSession = restoreSession()

  if (!hasSession) {
    await delay(Math.max(0, MIN_LOADER_MS - (Date.now() - started)))
    window.location.replace('/login')
    return
  }

  // 2. Mostrar contenido inmediatamente (pero respetando el mínimo de loader)
  const elapsed = Date.now() - started
  if (elapsed < MIN_LOADER_MS) {
    await delay(MIN_LOADER_MS - elapsed)
  }
  ready.value = true

  // 3. Verificar token con el servidor en background
  loadFromStorage()
})
</script>

<template>
  <slot v-if="ready" />
  <div v-else class="min-h-screen flex items-center justify-center">
    <RubikLoader label="Verificando sesión..." />
  </div>
</template>
