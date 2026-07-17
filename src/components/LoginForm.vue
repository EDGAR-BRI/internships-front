<script setup lang="ts">
import { ref } from 'vue'
import { api } from '../lib/api'
import { useAuth } from '../composables/useAuth'
import GoogleLoginButton from './GoogleLoginButton.vue'

const emit = defineEmits<{
  success: []
}>()

const { setAuth } = useAuth()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  if (!email.value || !password.value) {
    error.value = 'Ingresa email y contraseña'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const data = await api.post('/auth/login', {
      email: email.value,
      password: password.value,
    })

    setAuth(data.user, data.token)
    window.location.href = '/dashboard'
  } catch (e: any) {
    error.value = e.message || 'Error al iniciar sesión'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <GoogleLoginButton />

    <div class="relative">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-border"></div>
      </div>
      <div class="relative flex justify-center text-xs">
        <span class="bg-canvas px-2 text-text-muted">o continúa con email</span>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div v-if="error" class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-3">
        {{ error }}
      </div>

      <div class="space-y-1.5">
        <label for="email" class="block text-sm text-text-secondary">
          Email
        </label>
        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          placeholder="tu@email.com"
          class="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-accent"
        />
      </div>

      <div class="space-y-1.5">
        <label for="password" class="block text-sm text-text-secondary">
          Contraseña
        </label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
          class="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-accent"
        />
      </div>

      <button
        type="submit"
        :disabled="loading"
        class="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150"
      >
        {{ loading ? 'Iniciando sesión...' : 'Iniciar sesión' }}
      </button>
    </form>
  </div>
</template>
