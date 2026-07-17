<script setup lang="ts">
import { ref } from 'vue'
import { api } from '../lib/api'
import { useAuth } from '../composables/useAuth'
import GoogleLoginButton from './GoogleLoginButton.vue'

const { setAuth } = useAuth()

const fullName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  if (!fullName.value || !email.value || !password.value) {
    error.value = 'Todos los campos son obligatorios'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Las contraseñas no coinciden'
    return
  }

  if (password.value.length < 8) {
    error.value = 'La contraseña debe tener al menos 8 caracteres'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const data = await api.post('/auth/signup', {
      fullName: fullName.value,
      email: email.value,
      password: password.value,
      passwordConfirmation: confirmPassword.value,
    })

    setAuth(data.user, data.token)
    window.location.href = '/dashboard'
  } catch (e: any) {
    error.value = e.message || 'Error al crear cuenta'
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
        <span class="bg-canvas px-2 text-text-muted">o regístrate con email</span>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div v-if="error" class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-3">
        {{ error }}
      </div>

      <div class="space-y-1.5">
        <label for="fullName" class="block text-sm text-text-secondary">
          Nombre completo
        </label>
        <input
          id="fullName"
          v-model="fullName"
          type="text"
          autocomplete="name"
          placeholder="Tu nombre"
          class="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-accent"
        />
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
          autocomplete="new-password"
          placeholder="Mínimo 8 caracteres"
          class="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-accent"
        />
      </div>

      <div class="space-y-1.5">
        <label for="confirmPassword" class="block text-sm text-text-secondary">
          Confirmar contraseña
        </label>
        <input
          id="confirmPassword"
          v-model="confirmPassword"
          type="password"
          autocomplete="new-password"
          placeholder="Repite tu contraseña"
          class="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-accent"
        />
      </div>

      <button
        type="submit"
        :disabled="loading"
        class="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150"
      >
        {{ loading ? 'Creando cuenta...' : 'Crear cuenta' }}
      </button>
    </form>
  </div>
</template>
