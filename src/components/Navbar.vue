<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'

const { user, isAuthenticated, logout, loadFromStorage } = useAuth()
const mobileMenuOpen = ref(false)

onMounted(async () => {
  await loadFromStorage()
})

async function handleLogout() {
  await logout()
  window.location.href = '/login'
}
</script>

<template>
  <nav class="bg-canvas border-b border-border sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-14">
        <div class="flex items-center gap-2">
          <a href="/" class="text-text font-semibold tracking-tight text-sm">
            Internship<span class="text-accent">Tracker</span>
          </a>
        </div>

        <div v-if="isAuthenticated" class="flex items-center gap-4">
          <a href="/dashboard" class="text-text-secondary hover:text-text text-sm transition-colors">
            Dashboard
          </a>
          <div class="flex items-center gap-3">
            <span class="text-text-secondary text-sm">
              {{ user?.fullName || user?.email }}
            </span>
            <button
              @click="handleLogout"
              class="text-text-muted hover:text-text text-sm transition-colors"
            >
              Salir
            </button>
          </div>
        </div>

        <div v-else class="flex items-center gap-4">
          <a href="/login" class="text-text-secondary hover:text-text text-sm transition-colors">
            Iniciar sesión
          </a>
          <a
            href="/register"
            class="bg-accent hover:bg-accent-hover text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-150"
          >
            Crear cuenta
          </a>
        </div>
      </div>
    </div>
  </nav>
</template>
