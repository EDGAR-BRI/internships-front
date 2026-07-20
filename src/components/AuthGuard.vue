<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const { loadFromStorage, isAuthenticated } = useAuth()
const ready = ref(false)

onMounted(async () => {
  await loadFromStorage()
  if (!isAuthenticated.value) {
    window.location.replace('/login')
    return
  }
  ready.value = true
})
</script>

<template>
  <slot v-if="ready" />
  <div v-else class="min-h-screen flex items-center justify-center">
    <p class="text-text-secondary text-sm">Verificando sesión...</p>
  </div>
</template>
