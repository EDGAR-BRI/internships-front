<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdmin } from '../composables/useAdmin'
import AdminUsersTab from './AdminUsersTab.vue'
import AdminPlansTab from './AdminPlansTab.vue'
import AdminRequestsTab from './AdminRequestsTab.vue'

const {
  users,
  summary,
  loading,
  error,
  upgradeRequests,
  fetchUsers,
  fetchSummary,
  fetchPlans,
  fetchUpgradeRequests,
  clearError,
} = useAdmin()

const activeTab = ref<'users' | 'plans' | 'requests'>('users')

const pendingCount = computed(
  () => upgradeRequests.value.filter((r) => r.status === 'pending').length
)

function initials(fullName: string | null, email: string): string {
  const source = fullName || email
  const parts = source.split(' ').filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

function isActiveUser(u: (typeof users.value)[number]): boolean {
  return u.completedDays > 0 || u.attendanceCount > 0
}

const adminCount = computed(() => users.value.filter((u) => u.role === 'admin').length)
const activeCount = computed(() => users.value.filter(isActiveUser).length)
const adminPct = computed(() =>
  users.value.length ? Math.round((adminCount.value / users.value.length) * 100) : 0
)
const activePct = computed(() =>
  users.value.length ? Math.round((activeCount.value / users.value.length) * 100) : 0
)

const topUsers = computed(() =>
  [...users.value].sort((a, b) => b.completedHours - a.completedHours).slice(0, 5)
)
const maxHours = computed(() => topUsers.value[0]?.completedHours || 1)

function barWidth(hours: number): string {
  return `${Math.max(hours > 0 ? 4 : 0, (hours / maxHours.value) * 100)}%`
}

const tabs = computed(() => [
  { key: 'users', label: 'Usuarios' },
  { key: 'plans', label: 'Planes' },
  { key: 'requests', label: 'Solicitudes Pro', badge: pendingCount.value },
])

async function refresh() {
  clearError()
  await Promise.all([fetchUsers(), fetchSummary(), fetchPlans(), fetchUpgradeRequests()])
}

function onRequestsChanged() {
  fetchUsers()
  fetchSummary()
}

onMounted(() => {
  fetchUsers()
  fetchSummary()
  fetchPlans()
  fetchUpgradeRequests()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Administración</h1>
        <p class="text-text-muted text-sm mt-1">Usuarios, planes y solicitudes</p>
      </div>
      <button
        @click="refresh"
        class="inline-flex items-center justify-center gap-2 bg-overlay hover:bg-hover border border-border rounded-md px-4 py-2 text-sm font-medium text-text-secondary hover:text-text transition-colors w-full sm:w-auto"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Actualizar
      </button>
    </div>

    <!-- Errores -->
    <div v-if="error" class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-3">
      {{ error }}
    </div>

    <!-- Resumen -->
    <div v-if="summary" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <div class="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
          <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <p class="text-2xl font-bold text-text leading-none">{{ summary.totalUsers }}</p>
          <p class="text-[11px] text-text-muted mt-1">Usuarios</p>
        </div>
      </div>
      <div class="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-success/10 text-success flex items-center justify-center flex-shrink-0">
          <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div>
          <p class="text-2xl font-bold text-accent leading-none">{{ summary.activeUsers }}</p>
          <p class="text-[11px] text-text-muted mt-1">Activos</p>
        </div>
      </div>
      <div class="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center flex-shrink-0">
          <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p class="text-2xl font-bold text-text leading-none">{{ summary.totalHours }}h</p>
          <p class="text-[11px] text-text-muted mt-1">Horas totales</p>
        </div>
      </div>
      <div class="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-neutral-500/10 text-text-secondary flex items-center justify-center flex-shrink-0">
          <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <p class="text-2xl font-bold text-text leading-none">{{ summary.totalNotes }}</p>
          <p class="text-[11px] text-text-muted mt-1">Notas</p>
        </div>
      </div>
      <div class="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-neutral-500/10 text-text-secondary flex items-center justify-center flex-shrink-0">
          <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div>
          <p class="text-2xl font-bold text-text leading-none">{{ summary.totalLogEntries }}</p>
          <p class="text-[11px] text-text-muted mt-1">Actividades</p>
        </div>
      </div>
    </div>

    <!-- Estadísticas visuales -->
    <div v-if="users.length" class="grid gap-3 lg:grid-cols-2">
      <div class="bg-surface border border-border rounded-xl p-5">
        <h3 class="text-sm font-semibold text-text mb-4">Composición de usuarios</h3>
        <div class="space-y-4">
          <div>
            <div class="flex items-center justify-between text-xs mb-1.5">
              <span class="text-text-muted">Por rol</span>
              <span class="text-text-secondary">{{ adminCount }} admin · {{ users.length - adminCount }} usuario{{ users.length - adminCount === 1 ? '' : 's' }}</span>
            </div>
            <div class="h-2.5 bg-hover rounded-full overflow-hidden flex">
              <div class="h-full bg-warning transition-all duration-500" :style="{ width: adminPct + '%' }"></div>
              <div class="h-full bg-neutral-500/40 transition-all duration-500" :style="{ width: (100 - adminPct) + '%' }"></div>
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between text-xs mb-1.5">
              <span class="text-text-muted">Por estado</span>
              <span class="text-text-secondary">{{ activeCount }} activo{{ activeCount === 1 ? '' : 's' }} · {{ users.length - activeCount }} inactivo{{ users.length - activeCount === 1 ? '' : 's' }}</span>
            </div>
            <div class="h-2.5 bg-hover rounded-full overflow-hidden flex">
              <div class="h-full bg-accent transition-all duration-500" :style="{ width: activePct + '%' }"></div>
              <div class="h-full bg-neutral-500/40 transition-all duration-500" :style="{ width: (100 - activePct) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-surface border border-border rounded-xl p-5">
        <h3 class="text-sm font-semibold text-text mb-4">Horas completadas por usuario</h3>
        <div v-if="topUsers.length" class="space-y-3">
          <div v-for="u in topUsers" :key="u.id" class="flex items-center gap-3">
            <div class="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
              {{ initials(u.fullName, u.email) }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-text-secondary truncate pr-2">{{ u.fullName || u.email }}</span>
                <span class="text-text font-semibold flex-shrink-0">{{ u.completedHours }}h</span>
              </div>
              <div class="h-1.5 bg-hover rounded-full overflow-hidden">
                <div class="h-full bg-accent rounded-full transition-all duration-500" :style="{ width: barWidth(u.completedHours) }"></div>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-text-muted">Sin horas registradas</p>
      </div>
    </div>

    <!-- Pestañas -->
    <div class="flex gap-1 border-b border-border overflow-x-auto">
      <button
        v-for="t in tabs"
        :key="t.key"
        @click="activeTab = t.key as typeof activeTab"
        class="px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 flex-shrink-0"
        :class="activeTab === t.key
          ? 'text-text border-accent'
          : 'text-text-muted hover:text-text border-transparent'"
      >
        {{ t.label }}
        <span
          v-if="t.badge"
          class="inline-flex items-center justify-center min-w-[1.25rem] px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-accent/15 text-accent"
        >
          {{ t.badge }}
        </span>
      </button>
    </div>

    <div v-if="loading && activeTab === 'users' && users.length === 0" class="flex items-center justify-center py-12">
      <div class="w-6 h-6 border-2 border-border-strong border-t-accent rounded-full animate-spin"></div>
    </div>

    <AdminUsersTab v-show="activeTab === 'users'" />
    <AdminPlansTab v-if="activeTab === 'plans'" />
    <AdminRequestsTab v-if="activeTab === 'requests'" @changed="onRequestsChanged" />
  </div>
</template>
