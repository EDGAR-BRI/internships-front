<script setup lang="ts">
import { ref } from 'vue'
import { api } from '../lib/api'
import { useAuth } from '../composables/useAuth'

const { token } = useAuth()

const currentPassword = ref('')
const newPassword = ref('')
const passwordConfirmation = ref('')
const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

async function handleSubmit() {
  saveError.value = ''
  saveSuccess.value = false

  if (newPassword.value.length < 8) {
    saveError.value = 'La nueva contraseña debe tener al menos 8 caracteres'
    return
  }
  if (newPassword.value !== passwordConfirmation.value) {
    saveError.value = 'Las contraseñas no coinciden'
    return
  }

  saving.value = true
  try {
    await api.put(
      '/account/password',
      {
        currentPassword: currentPassword.value || undefined,
        newPassword: newPassword.value,
        passwordConfirmation: passwordConfirmation.value,
      },
      token.value || undefined
    )
    currentPassword.value = ''
    newPassword.value = ''
    passwordConfirmation.value = ''
    saveSuccess.value = true
  } catch (e: any) {
    saveError.value = e.message || 'Error al cambiar contraseña'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-5">
    <div v-if="saveError" class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-3">
      {{ saveError }}
    </div>
    <div v-if="saveSuccess" class="bg-success/10 border border-success/20 text-accent text-sm rounded-md p-3">
      Contraseña actualizada.
    </div>

    <div class="space-y-1.5">
      <label for="current-password" class="block text-sm font-medium text-text">
        Contraseña actual <span class="text-text-muted">(si nunca estableciste una, déjala vacía)</span>
      </label>
      <input
        id="current-password"
        v-model="currentPassword"
        type="password"
        autocomplete="current-password"
        class="w-full box-border bg-surface border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
    </div>

    <div class="space-y-1.5">
      <label for="new-password" class="block text-sm font-medium text-text">
        Nueva contraseña <span class="text-error">*</span>
      </label>
      <input
        id="new-password"
        v-model="newPassword"
        type="password"
        autocomplete="new-password"
        minlength="8"
        maxlength="32"
        class="w-full box-border bg-surface border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
      <p class="text-xs text-text-muted">Mínimo 8 caracteres.</p>
    </div>

    <div class="space-y-1.5">
      <label for="confirm-password" class="block text-sm font-medium text-text">
        Confirmar nueva contraseña <span class="text-error">*</span>
      </label>
      <input
        id="confirm-password"
        v-model="passwordConfirmation"
        type="password"
        autocomplete="new-password"
        class="w-full box-border bg-surface border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
    </div>

    <button
      type="submit"
      :disabled="saving"
      class="bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-md text-sm font-medium transition-colors duration-150"
    >
      {{ saving ? 'Guardando...' : 'Cambiar contraseña' }}
    </button>
  </form>
</template>
