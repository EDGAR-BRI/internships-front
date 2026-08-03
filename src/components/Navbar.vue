<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'

const { user, isAuthenticated, logout, loadFromStorage } = useAuth()

onMounted(async () => {
  await loadFromStorage()
})

async function handleLogout() {
  await logout()
  window.location.href = '/login'
}

const isActive = (path: string) =>
  typeof window !== 'undefined' && window.location.pathname.startsWith(path)
</script>

<template>
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
          <a href="/dashboard" class="text-text-secondary hover:text-text text-sm transition-colors">
            Dashboard
          </a>
          <a href="/bitacora" class="text-text-secondary hover:text-text text-sm transition-colors">
            Bitácora
          </a>
          <a href="/ajustes" class="text-text-secondary hover:text-text text-sm transition-colors">
            Ajustes
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
        <span class="text-[10px] font-medium">Actividades</span>
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
        href="/ajustes"
        class="flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors"
        :class="isActive('/ajustes') ? 'text-accent' : 'text-text-muted'"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span class="text-[10px] font-medium">Ajustes</span>
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
</template>
