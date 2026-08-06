<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import RubikLoader from './RubikLoader.vue'

const { user, restoreSession, loadFromStorage } = useAuth()
const ready = ref(false)

const MIN_LOADER_MS = 1000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const isAdmin = computed(() => user.value?.role === 'admin')

onMounted(async () => {
  const started = Date.now()
  const hasSession = restoreSession()
  if (!hasSession) {
    await delay(Math.max(0, MIN_LOADER_MS - (Date.now() - started)))
    window.location.replace('/login')
    return
  }
  const elapsed = Date.now() - started
  if (elapsed < MIN_LOADER_MS) {
    await delay(MIN_LOADER_MS - elapsed)
  }
  ready.value = true
  loadFromStorage().then(() => {
    if (!isAdmin.value) {
      window.location.replace('/dashboard')
    }
  })
})
</script>

<template>
  <slot v-if="ready && isAdmin" />
  <div v-else class="min-h-screen flex items-center justify-center">
    <RubikLoader label="Verificando permisos..." />
  </div>
</template>
