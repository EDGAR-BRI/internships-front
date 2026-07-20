<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'

const { setAuth } = useAuth()

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  const userStr = params.get('user')
  const error = params.get('error')

  console.log('[GoogleCallback] mounted', {
    hasToken: !!token,
    tokenLength: token?.length,
    hasUserStr: !!userStr,
    error,
  })

  if (error) {
    window.location.replace(`/login?error=${encodeURIComponent(error)}`)
    return
  }

  if (!token || !userStr) {
    console.log('[GoogleCallback] Missing token or user, redirecting to login')
    window.location.replace('/login?error=missing_token')
    return
  }

  try {
    const user = JSON.parse(decodeURIComponent(userStr))
    console.log('[GoogleCallback] Setting auth, redirecting to dashboard', user)
    setAuth(user, token)
    console.log('[GoogleCallback] localStorage after setAuth:', {
      token: localStorage.getItem('auth_token')?.slice(0, 10),
      user: localStorage.getItem('auth_user')?.slice(0, 50),
    })
    window.location.replace('/dashboard')
  } catch (e) {
    console.error('[GoogleCallback] Error parsing user data from URL', e)
    window.location.replace('/login?error=invalid_callback')
  }
})
</script>

<template>
  <p class="text-text-secondary text-sm">Iniciando sesión...</p>
</template>
