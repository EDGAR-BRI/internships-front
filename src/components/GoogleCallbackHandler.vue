<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'

const { setAuth, loadFromStorage, isAuthenticated } = useAuth()

onMounted(async () => {
  await loadFromStorage()

  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  const userStr = params.get('user')

  if (token && userStr) {
    try {
      const user = JSON.parse(decodeURIComponent(userStr))
      setAuth(user, token)
      window.history.replaceState({}, '', '/dashboard')
    } catch (e) {
      console.error('Error parsing user data from URL')
    }
  }

  if (!isAuthenticated.value && !token) {
    window.location.href = '/login'
  }
})
</script>

<template>
  <div></div>
</template>
