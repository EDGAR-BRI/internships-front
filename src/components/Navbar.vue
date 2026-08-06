<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuth } from '../composables/useAuth'
import SettingsModal from './SettingsModal.vue'
import NoteModal from './NoteModal.vue'

const { user, isAuthenticated, logout, restoreSession } = useAuth()

const noteModalOpen = ref(false)

const initials = computed(() => {
  const name = user.value?.fullName || user.value?.email || ''
  const [first, last] = name.split(' ')
  if (first && last) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
  }
  return first.slice(0, 2).toUpperCase()
})

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

function openSettings() {
  window.dispatchEvent(new CustomEvent('open-settings-modal'))
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
            <a
              v-if="user?.role === 'admin'"
              href="/admin"
              class="text-sm transition-colors"
              :class="isActive('/admin') ? 'text-accent font-medium' : 'text-text-secondary hover:text-text'"
            >
              Admin
            </a>
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2.5">
                <div
                  v-if="user?.avatarUrl"
                  class="w-8 h-8 rounded-full overflow-hidden ring-2 ring-accent/30 shrink-0"
                >
                  <img :src="user.avatarUrl" :alt="user?.fullName || 'Avatar'" class="w-full h-full object-cover" />
                </div>
                <div
                  v-else
                  class="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-semibold ring-2 ring-accent/30 shrink-0"
                >
                  {{ initials }}
                </div>
                <span class="text-text-secondary text-sm">
                  {{ user?.fullName || user?.email }}
                </span>
              </div>
              <button
                @click="openSettings"
                class="text-text-muted hover:text-text transition-colors p-2 rounded-md hover:bg-hover"
                title="Ajustes"
                aria-label="Ajustes"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
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
        <div class="flex items-center gap-3">
          <button
            @click="openSettings"
            class="text-text-muted transition-colors p-1.5"
            title="Ajustes"
            aria-label="Ajustes"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <a
            v-if="user?.role === 'admin'"
            href="/admin"
            class="text-xs font-medium transition-colors"
            :class="isActive('/admin') ? 'text-accent' : 'text-text-muted'"
          >
            Admin
          </a>
          <div class="flex items-center gap-2">
            <div
              v-if="user?.avatarUrl"
              class="w-7 h-7 rounded-full overflow-hidden ring-2 ring-accent/30 shrink-0"
            >
              <img :src="user.avatarUrl" :alt="user?.fullName || 'Avatar'" class="w-full h-full object-cover" />
            </div>
            <div
              v-else
              class="w-7 h-7 rounded-full bg-accent/15 text-accent flex items-center justify-center text-[10px] font-semibold ring-2 ring-accent/30 shrink-0"
            >
              {{ initials }}
            </div>
            <span class="text-text-muted text-xs truncate max-w-[40%] text-right">
              {{ user?.fullName || user?.email }}
            </span>
          </div>
        </div>
      </div>
    </header>

    <!-- Mobile bottom tab bar -->
    <nav v-if="isAuthenticated" class="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-canvas border-t border-border">
      <div class="relative flex items-stretch justify-around h-14">
        <button
          @click="noteModalOpen = true"
          class="absolute left-1/2 -translate-x-1/2 -top-5 z-10 w-12 h-12 rounded-full bg-accent hover:bg-accent-hover active:scale-95 text-white shadow-lg shadow-accent/30 border-4 border-canvas transition-colors flex items-center justify-center"
          title="Agregar nota"
          aria-label="Agregar nota"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
        </button>

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
          class="flex flex-col items-center justify-center gap-0.5 flex-1 mr-7 transition-colors"
          :class="isActive('/bitacora') ? 'text-accent' : 'text-text-muted'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span class="text-[10px] font-medium">Bitácora</span>
        </a>

        <a
          href="/asistencia"
          class="flex flex-col items-center justify-center gap-0.5 flex-1 ml-7 transition-colors"
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

    <NoteModal :is-open="noteModalOpen" @close="noteModalOpen = false" />
  </div>
</template>
