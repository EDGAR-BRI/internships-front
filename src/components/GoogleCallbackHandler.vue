<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const { setAuth } = useAuth()
const visibleError = ref<string | null>(null)

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  const userStr = params.get('user')
  const error = params.get('error')

  console.log('[GoogleCallback] mounted', {
    hasToken: !!token,
    tokenLength: token?.length,
    hasUserStr: !!userStr,
    userStrLength: userStr?.length,
    userStrFirst: userStr?.slice(0, 50),
    error,
  })

  if (error) {
    window.location.replace(`/login?error=${encodeURIComponent(error)}`)
    return
  }

  if (!token || !userStr) {
    visibleError.value = `Missing token or user. token=${!!token} user=${!!userStr}`
    console.log('[GoogleCallback] Missing token or user, NOT redirecting (showing error)')
    return
  }

  try {
    let user
    try {
      user = JSON.parse(userStr)
      console.log('[GoogleCallback] Parsed user directly (no decode needed)')
    } catch {
      console.log('[GoogleCallback] Direct parse failed, trying decodeURIComponent')
      try {
        user = JSON.parse(decodeURIComponent(userStr))
        console.log('[GoogleCallback] Parsed user after decode')
      } catch (e2) {
        visibleError.value = `Parse failed. userStr (first 200 chars): ${userStr.slice(0, 200)}`
        console.error('[GoogleCallback] Both parse attempts failed', {
          userStr,
          userStrSlice: userStr?.slice(0, 200),
        })
        return
      }
    }
    console.log('[GoogleCallback] Setting auth, redirecting to dashboard', user)
    setAuth(user, token)
    console.log('[GoogleCallback] localStorage after setAuth:', {
      token: localStorage.getItem('auth_token')?.slice(0, 10),
      user: localStorage.getItem('auth_user')?.slice(0, 50),
    })
    window.location.replace('/dashboard')
  } catch (e) {
    visibleError.value = `Unexpected error: ${(e as Error).message}`
    console.error('[GoogleCallback] Unexpected error', e)
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div v-if="visibleError" class="max-w-2xl w-full bg-error/10 border border-error/30 rounded-md p-4 text-sm">
      <p class="font-semibold text-error mb-2">Error en el callback de Google:</p>
      <pre class="whitespace-pre-wrap break-all text-text">{{ visibleError }}</pre>
    </div>
    <p v-else class="text-text-secondary text-sm">Iniciando sesión...</p>
  </div>
</template>
