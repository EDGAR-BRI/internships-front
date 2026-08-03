<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdmin } from '../composables/useAdmin'
import { useAuth } from '../composables/useAuth'

const { users, summary, loading, error, fetchUsers, fetchSummary } = useAdmin()
const { user } = useAuth()

const searchQuery = ref('')

const filteredUsers = computed(() => {
  if (!searchQuery.value.trim()) return users.value
  const q = searchQuery.value.toLowerCase()
  return users.value.filter(
    (u) =>
      (u.fullName?.toLowerCase().includes(q) ?? false) || u.email.toLowerCase().includes(q)
  )
})

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function isActiveUser(u: (typeof users.value)[number]): boolean {
  return u.completedDays > 0 || u.attendanceCount > 0
}

onMounted(() => {
  fetchUsers()
  fetchSummary()
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Administración</h1>
      <p class="text-text-muted text-sm mt-1">Usuarios registrados y su actividad</p>
    </div>

    <div v-if="error" class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-3">
      {{ error }}
    </div>

    <!-- Resumen -->
    <div v-if="summary" class="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <div class="bg-surface border border-border rounded-lg p-4">
        <p class="text-xs text-text-muted">Usuarios</p>
        <p class="text-2xl font-bold text-text mt-1">{{ summary.totalUsers }}</p>
      </div>
      <div class="bg-surface border border-border rounded-lg p-4">
        <p class="text-xs text-text-muted">Activos</p>
        <p class="text-2xl font-bold text-accent mt-1">{{ summary.activeUsers }}</p>
      </div>
      <div class="bg-surface border border-border rounded-lg p-4">
        <p class="text-xs text-text-muted">Horas totales</p>
        <p class="text-2xl font-bold text-text mt-1">{{ summary.totalHours }}h</p>
      </div>
      <div class="bg-surface border border-border rounded-lg p-4">
        <p class="text-xs text-text-muted">Notas</p>
        <p class="text-2xl font-bold text-text mt-1">{{ summary.totalNotes }}</p>
      </div>
      <div class="bg-surface border border-border rounded-lg p-4">
        <p class="text-xs text-text-muted">Actividades</p>
        <p class="text-2xl font-bold text-text mt-1">{{ summary.totalLogEntries }}</p>
      </div>
    </div>

    <!-- Buscador -->
    <div class="relative">
      <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        v-model="searchQuery"
        placeholder="Buscar por nombre o correo..."
        class="w-full bg-overlay border border-border rounded-md pl-9 pr-3 py-2 text-sm text-text placeholder:text-text-disabled focus:outline-none focus:border-accent transition-colors"
      />
    </div>

    <!-- Tabla de usuarios -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="w-6 h-6 border-2 border-border-strong border-t-accent rounded-full animate-spin"></div>
    </div>

    <div v-else-if="filteredUsers.length === 0" class="text-center py-12">
      <p class="text-text-muted text-sm">No hay usuarios registrados.</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="u in filteredUsers"
        :key="u.id"
        class="bg-surface border border-border rounded-lg p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="text-sm font-semibold text-text truncate">{{ u.fullName || 'Sin nombre' }}</p>
              <span
                class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0"
                :class="u.role === 'admin'
                  ? 'bg-warning/10 text-warning border-warning/20'
                  : 'bg-overlay text-text-secondary border-border'"
              >
                {{ u.role === 'admin' ? 'Admin' : 'Usuario' }}
              </span>
              <span
                class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
                :class="isActiveUser(u)
                  ? 'bg-accent/10 text-accent'
                  : 'bg-neutral-500/10 text-neutral-400'"
              >
                {{ isActiveUser(u) ? 'Activo' : 'Inactivo' }}
              </span>
            </div>
            <p class="text-xs text-text-muted mt-0.5 truncate">{{ u.email }}</p>
            <p class="text-xs text-text-muted mt-0.5">
              Alta: {{ formatDate(u.createdAt) }} · Última actividad: {{ formatDate(u.lastActivity) }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-right flex-shrink-0">
            <div>
              <p class="text-xs text-text-muted">Días</p>
              <p class="text-sm font-semibold text-text">{{ u.completedDays }}</p>
            </div>
            <div>
              <p class="text-xs text-text-muted">Horas</p>
              <p class="text-sm font-semibold text-text">{{ u.completedHours }}h</p>
            </div>
            <div>
              <p class="text-xs text-text-muted">Asistencias</p>
              <p class="text-sm font-medium text-text-secondary">{{ u.attendanceCount }}</p>
            </div>
            <div>
              <p class="text-xs text-text-muted">Notas</p>
              <p class="text-sm font-medium text-text-secondary">{{ u.notesCount }}</p>
            </div>
            <div>
              <p class="text-xs text-text-muted">Actividades</p>
              <p class="text-sm font-medium text-text-secondary">{{ u.logEntriesCount }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
