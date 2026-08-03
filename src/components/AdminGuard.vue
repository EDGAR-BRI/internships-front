<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const { user, restoreSession, loadFromStorage } = useAuth()
const ready = ref(false)

const isAdmin = computed(() => user.value?.role === 'admin')

onMounted(() => {
  const hasSession = restoreSession()
  if (!hasSession) {
    window.location.replace('/login')
    return
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
    <p class="text-text-secondary text-sm">Verificando permisos...</p>
  </div>
</template>
