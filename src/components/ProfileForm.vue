<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'
import { api } from '../lib/api'

const { user, token, updateUser } = useAuth()

const fullName = ref('')
const avatarUrl = ref('')
const profilePublic = ref(false)
const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

onMounted(() => {
  fullName.value = user.value?.fullName || ''
  avatarUrl.value = user.value?.avatarUrl || ''
  profilePublic.value = !!user.value?.profilePublic
})

async function handleSubmit() {
  saveError.value = ''
  saveSuccess.value = false
  saving.value = true
  try {
    const res = await api.put<{ user: typeof user.value }>(
      '/account/profile',
      {
        fullName: fullName.value.trim() || null,
        avatarUrl: avatarUrl.value.trim() || null,
        profilePublic: profilePublic.value,
      },
      token.value || undefined
    )
    if (res.user) {
      updateUser(res.user)
    }
    saveSuccess.value = true
  } catch (e: any) {
    saveError.value = e.message || 'Error al guardar perfil'
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
      Perfil actualizado.
    </div>

    <div class="space-y-1.5">
      <label for="profile-name" class="block text-sm font-medium text-text">
        Nombre completo
      </label>
      <input
        id="profile-name"
        v-model="fullName"
        type="text"
        maxlength="100"
        placeholder="Tu nombre"
        class="w-full box-border bg-surface border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
    </div>

    <div class="space-y-1.5">
      <label for="profile-avatar" class="block text-sm font-medium text-text">
        URL de foto <span class="text-text-muted">(opcional)</span>
      </label>
      <input
        id="profile-avatar"
        v-model="avatarUrl"
        type="url"
        maxlength="500"
        placeholder="https://..."
        class="w-full box-border bg-surface border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
    </div>

    <div class="space-y-1.5">
      <label class="flex items-center justify-between gap-3 cursor-pointer select-none">
        <span class="block text-sm font-medium text-text">Perfil público</span>
        <input
          v-model="profilePublic"
          type="checkbox"
          class="w-4 h-4 rounded accent-[var(--color-accent)]"
        />
      </label>
      <p class="text-xs text-text-muted">
        Actívalo para aparecer en el ranking de la comunidad y que otros puedan ver tus notas.
        Solo se muestra tu nombre, nunca tu correo.
      </p>
    </div>

    <button
      type="submit"
      :disabled="saving"
      class="bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-md text-sm font-medium transition-colors duration-150"
    >
      {{ saving ? 'Guardando...' : 'Guardar perfil' }}
    </button>
  </form>
</template>
