<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const { loadFromStorage, isAuthenticated, token } = useAuth()
const ready = ref(false)

onMounted(async () => {
  console.log('[AuthGuard] mounted, calling loadFromStorage')
  await loadFromStorage()
  console.log('[AuthGuard] loadFromStorage done', {
    isAuthenticated: isAuthenticated.value,
    hasToken: !!token.value,
  })
  if (!isAuthenticated.value) {
    console.log('[AuthGuard] Not authenticated, redirecting to login')
    window.location.replace('/login')
    return
  }
  console.log('[AuthGuard] Authenticated, setting ready=true')
  ready.value = true
})
</script>

<template>
  <slot v-if="ready" />
  <div v-else class="min-h-screen flex items-center justify-center">
    <p class="text-text-secondary text-sm">Verificando sesión...</p>
  </div>
</template>
