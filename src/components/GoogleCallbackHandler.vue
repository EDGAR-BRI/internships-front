<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'

const { setAuth } = useAuth()

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  const userStr = params.get('user')
  const error = params.get('error')

  if (error) {
    window.location.replace(`/login?error=${encodeURIComponent(error)}`)
    return
  }

  if (!token || !userStr) {
    window.location.replace('/login?error=missing_token')
    return
  }

  try {
    const user = JSON.parse(decodeURIComponent(userStr))
    setAuth(user, token)
    window.location.replace('/dashboard')
  } catch (e) {
    console.error('Error parsing user data from URL', e)
    window.location.replace('/login?error=invalid_callback')
  }
})
</script>

<template>
  <p class="text-text-secondary text-sm">Iniciando sesión...</p>
</template>
