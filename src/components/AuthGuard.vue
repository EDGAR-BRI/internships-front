<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const { restoreSession, loadFromStorage, isAuthenticated } = useAuth()
const ready = ref(false)

onMounted(() => {
  // 1. Restaurar sesión sincrónicamente desde localStorage
  const hasSession = restoreSession()

  if (!hasSession) {
    window.location.replace('/login')
    return
  }

  // 2. Mostrar contenido inmediatamente
  ready.value = true

  // 3. Verificar token con el servidor en background
  loadFromStorage()
})
</script>

<template>
  <slot v-if="ready" />
  <div v-else class="min-h-screen flex items-center justify-center">
    <p class="text-text-secondary text-sm">Verificando sesión...</p>
  </div>
</template>
