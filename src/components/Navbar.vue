<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'
import SettingsModal from './SettingsModal.vue'

const { user, isAuthenticated, logout, restoreSession } = useAuth()

// Restaurar sesión lo antes posible (en el cliente al hidratar)
if (typeof window !== 'undefined') {
  restoreSession()
}

onMounted(() => {
  restoreSession()
})

async function handleLogout() {
  await logout()
  window.location.href = '/login'
}

function isActive(path: string): boolean {
  if (typeof window === 'undefined') return false
  return window.location.pathname === path || window.location.pathname.startsWith(path + '/')
}
</script>

<template>
  <div class="contents">
    <!-- Desktop navbar -->
    <nav class="bg-canvas border-b border-border sticky top-0 z-50 hidden sm:block">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-14">
          <div class="flex items-center gap-2">
            <a href="/" class="text-text font-semibold tracking-tight text-sm">
              Internship<span class="text-accent">Tracker</span>
            </a>
          </div>

          <div v-if="isAuthenticated" class="flex items-center gap-4">
            <a
              href="/dashboard"
              class="text-sm transition-colors"
              :class="isActive('/dashboard') ? 'text-accent font-medium' : 'text-text-secondary hover:text-text'"
            >
              Dashboard
            </a>
            <a
              href="/bitacora"
              class="text-sm transition-colors"
              :class="isActive('/bitacora') ? 'text-accent font-medium' : 'text-text-secondary hover:text-text'"
            >
              Bitácora
            </a>
            <a
              href="/asistencia"
              class="text-sm transition-colors"
              :class="isActive('/asistencia') ? 'text-accent font-medium' : 'text-text-secondary hover:text-text'"
            >
              Asistencia
            </a>
            <div class="flex items-center gap-3">
              <span class="text-text-secondary text-sm">
                {{ user?.fullName || user?.email }}
              </span>
              <button
                @click="handleLogout"
                class="bg-overlay hover:bg-hover text-text-muted hover:text-error text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
              >
                Salir
              </button>
            </div>
          </div>

        </div>
      </div>
    </nav>

    <!-- Mobile header -->
    <header v-if="isAuthenticated" class="sm:hidden bg-canvas border-b border-border sticky top-0 z-50">
      <div class="flex items-center justify-between h-12 px-4">
        <a href="/" class="text-text font-semibold tracking-tight text-sm">
          Internship<span class="text-accent">Tracker</span>
        </a>
        <span class="text-text-muted text-xs truncate max-w-[50%] text-right">
          {{ user?.fullName || user?.email }}
        </span>
      </div>
    </header>

    <!-- Mobile bottom tab bar -->
    <nav v-if="isAuthenticated" class="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-canvas border-t border-border">
      <div class="flex items-stretch justify-around h-14">
        <a
          href="/dashboard"
          class="flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors"
          :class="isActive('/dashboard') ? 'text-accent' : 'text-text-muted'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span class="text-[10px] font-medium">Dashboard</span>
        </a>

        <a
          href="/bitacora"
          class="flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors"
          :class="isActive('/bitacora') ? 'text-accent' : 'text-text-muted'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span class="text-[10px] font-medium">Bitácora</span>
        </a>

        <a
          href="/asistencia"
          class="flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors"
          :class="isActive('/asistencia') ? 'text-accent' : 'text-text-muted'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-[10px] font-medium">Asistencia</span>
        </a>

        <button
          @click="handleLogout"
          class="flex flex-col items-center justify-center gap-0.5 flex-1 text-text-muted transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span class="text-[10px] font-medium">Salir</span>
        </button>
      </div>
    </nav>

    <!-- Spacer for mobile bottom bar -->
    <div v-if="isAuthenticated" class="sm:hidden h-14"></div>

    <SettingsModal />
  </div>
</template>
