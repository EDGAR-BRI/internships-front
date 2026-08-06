<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import RubikLoader from './RubikLoader.vue'

const { setAuth } = useAuth()
const visibleError = ref<string | null>(null)

const MIN_LOADER_MS = 1000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

onMounted(async () => {
  const started = Date.now()
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  let userStr = params.get('user')
  const error = params.get('error')

  if (userStr) {
    const cutIdx = userStr.search(/[?&#]/)
    if (cutIdx !== -1) {
      userStr = userStr.slice(0, cutIdx)
    }
  }

  console.log('[GoogleCallback] mounted', {
    hasToken: !!token,
    tokenLength: token?.length,
    hasUserStr: !!userStr,
    userStrLength: userStr?.length,
  })

  if (error) {
    window.location.replace(`/login?error=${encodeURIComponent(error)}`)
    return
  }

  if (!token || !userStr) {
    visibleError.value = `Missing token or user. token=${!!token} user=${!!userStr}`
    return
  }

  try {
    const user = JSON.parse(userStr)
    setAuth(user, token)
    const elapsed = Date.now() - started
    if (elapsed < MIN_LOADER_MS) {
      await delay(MIN_LOADER_MS - elapsed)
    }
    window.location.replace('/dashboard')
  } catch (e) {
    visibleError.value = `Parse failed. userStr: ${userStr.slice(0, 200)}`
    console.error('[GoogleCallback] Parse failed', e, { userStr })
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div v-if="visibleError" class="max-w-2xl w-full bg-error/10 border border-error/30 rounded-md p-4 text-sm">
      <p class="font-semibold text-error mb-2">Error en el callback de Google:</p>
      <pre class="whitespace-pre-wrap break-all text-text">{{ visibleError }}</pre>
    </div>
    <RubikLoader v-else label="Iniciando sesión..." />
  </div>
</template>
