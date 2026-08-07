<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useAuth } from '../composables/useAuth'
import SettingsModal from './SettingsModal.vue'
import NoteModal from './NoteModal.vue'

const { user, isAuthenticated, logout, restoreSession } = useAuth()

const noteModalOpen = ref(false)
const menuOpen = ref(false)

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
  document.addEventListener('click', closeMenuOnOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenuOnOutside)
})

function closeMenuOnOutside(e: Event) {
  const el = (e.target as HTMLElement).closest('.avatar-menu')
  if (!el) menuOpen.value = false
}

async function handleLogout() {
  menuOpen.value = false
  await logout()
  window.location.href = '/login'
}

function openSettings() {
  menuOpen.value = false
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

          <div v-if="isAuthenticated" class="flex items-center gap-5">
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
              href="/comunidad"
              class="text-sm transition-colors"
              :class="isActive('/comunidad') ? 'text-accent font-medium' : 'text-text-secondary hover:text-text'"
            >
              Comunidad
            </a>
            <a
              v-if="user?.role === 'admin'"
              href="/admin"
              class="text-sm transition-colors"
              :class="isActive('/admin') ? 'text-accent font-medium' : 'text-text-secondary hover:text-text'"
            >
              Admin
            </a>

            <!-- Avatar menu -->
            <div class="avatar-menu relative">
              <button
                @click.stop="menuOpen = !menuOpen"
                class="flex items-center gap-2 focus:outline-none"
                aria-label="Menú de usuario"
              >
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
                <svg
                  class="w-3.5 h-3.5 text-text-muted transition-transform"
                  :class="menuOpen ? 'rotate-180' : ''"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <Transition name="menu">
                <div
                  v-if="menuOpen"
                  class="absolute right-0 top-full mt-2 w-56 bg-surface border border-border-strong rounded-lg shadow-2xl overflow-hidden"
                >
                  <div class="px-4 py-3 border-b border-border">
                    <p class="text-sm font-semibold text-text truncate">{{ user?.fullName || 'Usuario' }}</p>
                    <p class="text-xs text-text-muted truncate">{{ user?.email }}</p>
                  </div>
                  <button
                    @click="openSettings"
                    class="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:text-text hover:bg-hover transition-colors flex items-center gap-2.5"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Ajustes
                  </button>
                  <button
                    @click="handleLogout"
                    class="w-full text-left px-4 py-2.5 text-sm text-error hover:bg-hover transition-colors flex items-center gap-2.5 border-t border-border"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Cerrar sesión
                  </button>
                </div>
              </Transition>
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
        <div class="flex items-center gap-2">
          <a
            v-if="user?.role === 'admin'"
            href="/admin"
            class="text-xs font-medium transition-colors"
            :class="isActive('/admin') ? 'text-accent' : 'text-text-muted'"
          >
            Admin
          </a>

          <!-- Avatar menu (solo foto) -->
          <div class="avatar-menu relative">
            <button
              @click.stop="menuOpen = !menuOpen"
              class="focus:outline-none"
              aria-label="Menú de usuario"
            >
              <div
                v-if="user?.avatarUrl"
                class="w-8 h-8 rounded-full overflow-hidden ring-2 ring-accent/30 shrink-0"
              >
                <img :src="user.avatarUrl" :alt="user?.fullName || 'Avatar'" class="w-full h-full object-cover" />
              </div>
              <div
                v-else
                class="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center text-[11px] font-semibold ring-2 ring-accent/30 shrink-0"
              >
                {{ initials }}
              </div>
            </button>

            <Transition name="menu">
              <div
                v-if="menuOpen"
                class="absolute right-0 top-full mt-2 w-52 bg-surface border border-border-strong rounded-lg shadow-2xl overflow-hidden"
              >
                <div class="px-4 py-3 border-b border-border">
                  <p class="text-sm font-semibold text-text truncate">{{ user?.fullName || 'Usuario' }}</p>
                  <p class="text-xs text-text-muted truncate">{{ user?.email }}</p>
                </div>
                <button
                  @click="openSettings"
                  class="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:text-text hover:bg-hover transition-colors flex items-center gap-2.5"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Ajustes
                </button>
                <button
                  @click="handleLogout"
                  class="w-full text-left px-4 py-2.5 text-sm text-error hover:bg-hover transition-colors flex items-center gap-2.5 border-t border-border"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Cerrar sesión
                </button>
              </div>
            </Transition>
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

        <a
          href="/comunidad"
          class="flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors"
          :class="isActive('/comunidad') ? 'text-accent' : 'text-text-muted'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span class="text-[10px] font-medium">Comunidad</span>
        </a>
      </div>
    </nav>

    <!-- Spacer for mobile bottom bar -->
    <div v-if="isAuthenticated" class="sm:hidden h-14"></div>

    <SettingsModal />

    <NoteModal :is-open="noteModalOpen" @close="noteModalOpen = false" />
  </div>
</template>

<style scoped>
.menu-enter-active,
.menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
