<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import SettingsForm from './SettingsForm.vue'
import ProfileForm from './ProfileForm.vue'
import PasswordForm from './PasswordForm.vue'

const isOpen = ref(false)
const activeTab = ref<'internship' | 'account'>('internship')

function open() {
  isOpen.value = true
}

function close() {
  isOpen.value = false
}

function handleSaved() {
  close()
  window.dispatchEvent(new CustomEvent('settings-saved'))
}

onMounted(() => {
  window.addEventListener('open-settings-modal', open)
})

onUnmounted(() => {
  window.removeEventListener('open-settings-modal', open)
})
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[60] overflow-y-auto bg-black/60 backdrop-blur-sm"
    @click="close"
  >
    <div class="min-h-full flex items-center justify-center p-4 sm:p-6">
      <div
        class="bg-canvas border border-border rounded-lg w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto modal-open"
        @click.stop
      >
        <div class="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 class="text-lg font-semibold text-text">Ajustes</h2>
          <button
            @click="close"
            class="text-text-muted hover:text-text transition-colors p-1.5 rounded-md hover:bg-hover"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="flex gap-1.5 px-6 pt-4 flex-shrink-0">
          <button
            type="button"
            @click="activeTab = 'internship'"
            class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            :class="activeTab === 'internship'
              ? 'bg-accent text-white'
              : 'bg-overlay text-text-secondary hover:text-text'"
          >
            Pasantía
          </button>
          <button
            type="button"
            @click="activeTab = 'account'"
            class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            :class="activeTab === 'account'
              ? 'bg-accent text-white'
              : 'bg-overlay text-text-secondary hover:text-text'"
          >
            Cuenta
          </button>
        </div>

        <div class="overflow-y-auto p-4 sm:p-6">
          <SettingsForm v-if="activeTab === 'internship'" @saved="handleSaved" />
          <div v-else class="space-y-8">
            <div>
              <h3 class="text-sm font-semibold text-text mb-3">Perfil</h3>
              <ProfileForm />
            </div>
            <div class="pt-6 border-t border-border">
              <h3 class="text-sm font-semibold text-text mb-3">Contraseña</h3>
              <PasswordForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
