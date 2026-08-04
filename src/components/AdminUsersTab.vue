<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  useAdmin,
  type AdminUser,
  type AdminUserDetail,
} from '../composables/useAdmin'
import { useAuth } from '../composables/useAuth'

const {
  users,
  plans,
  details,
  detailLoadingId,
  actionError,
  fetchUserDetail,
  updateRole,
  deleteUser,
  assignPlan,
  fetchPlans,
} = useAdmin()

const { user: currentUser } = useAuth()

const searchQuery = ref('')
const roleFilter = ref<'all' | 'admin' | 'user'>('all')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
const sortKey = ref<
  'name' | 'days' | 'hours' | 'attendances' | 'notes' | 'activities' | 'lastActivity' | null
>(null)
const sortDir = ref<'asc' | 'desc'>('asc')
const expandedId = ref<number | null>(null)
const modal = ref<{ type: 'role' | 'delete'; user: AdminUser } | null>(null)
const busy = ref(false)

const planSlugFor = ref<Record<number, string>>({})
const expiresFor = ref<Record<number, string>>({})
const planSaving = ref<number | null>(null)

onMounted(() => {
  fetchPlans()
})

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Terminada',
}

const statusPillClasses: Record<string, string> = {
  pending: 'bg-neutral-500/10 text-neutral-400',
  in_progress: 'bg-warning/10 text-warning',
  done: 'bg-accent/10 text-accent',
}

const modeLabels: Record<string, string> = {
  on_site: 'Presencial',
  remote: 'Remoto',
}

const modeClasses: Record<string, string> = {
  on_site: 'bg-accent/10 text-accent',
  remote: 'bg-warning/10 text-warning',
}

function initials(fullName: string | null, email: string): string {
  const source = fullName || email
  const parts = source.split(' ').filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

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

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  })
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days} día${days === 1 ? '' : 's'}`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `hace ${weeks} sem`
  const months = Math.floor(days / 30)
  return `hace ${months} mes${months === 1 ? '' : 'es'}`
}

function isActiveUser(u: AdminUser): boolean {
  return u.completedDays > 0 || u.attendanceCount > 0
}

function planBadgeClasses(slug: string): string {
  if (slug === 'pro') return 'bg-accent/10 text-accent border-accent/20'
  if (slug === 'free') return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'
  return 'bg-overlay text-text-secondary border-border'
}

function planNameFor(detail: AdminUserDetail): string {
  return detail.plan?.name || 'Gratis'
}

const filteredUsers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return users.value.filter((u) => {
    if (roleFilter.value !== 'all' && u.role !== roleFilter.value) return false
    if (statusFilter.value === 'active' && !isActiveUser(u)) return false
    if (statusFilter.value === 'inactive' && isActiveUser(u)) return false
    if (!q) return true
    return (
      (u.fullName?.toLowerCase().includes(q) ?? false) || u.email.toLowerCase().includes(q)
    )
  })
})

function sortValue(u: AdminUser, key: NonNullable<typeof sortKey.value>): string | number | null {
  switch (key) {
    case 'name':
      return (u.fullName || u.email).toLowerCase()
    case 'days':
      return u.completedDays
    case 'hours':
      return u.completedHours
    case 'attendances':
      return u.attendanceCount
    case 'notes':
      return u.notesCount
    case 'activities':
      return u.logEntriesCount
    case 'lastActivity':
      return u.lastActivity ? new Date(u.lastActivity).getTime() : null
    default:
      return null
  }
}

const sortedUsers = computed(() => {
  const list = filteredUsers.value
  if (!sortKey.value) return list
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    const av = sortValue(a, sortKey.value!)
    const bv = sortValue(b, sortKey.value!)
    if (av === null) return 1
    if (bv === null) return -1
    if (typeof av === 'string' && typeof bv === 'string') {
      return av.localeCompare(bv, 'es') * dir
    }
    return ((av as number) - (bv as number)) * dir
  })
})

function setSort(key: NonNullable<typeof sortKey.value>) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = key === 'name' ? 'asc' : 'desc'
  }
}

function sortArrow(key: string): string {
  if (sortKey.value !== key) return 'text-text-disabled'
  return sortDir.value === 'asc' ? 'text-accent' : 'text-accent rotate-180'
}

function detailFor(id: number): AdminUserDetail | undefined {
  return details.value[id]
}

async function toggleDetail(u: AdminUser) {
  if (expandedId.value === u.id) {
    expandedId.value = null
    return
  }
  expandedId.value = u.id
  if (!details.value[u.id]) {
    await fetchUserDetail(u.id)
  }
}

function openRoleModal(u: AdminUser) {
  modal.value = { type: 'role', user: u }
}

function openDeleteModal(u: AdminUser) {
  modal.value = { type: 'delete', user: u }
}

function closeModal() {
  if (busy.value) return
  modal.value = null
}

async function confirmModalAction() {
  if (!modal.value) return
  busy.value = true
  const { type, user } = modal.value
  let ok = false
  if (type === 'role') {
    const target = user.role === 'admin' ? 'user' : 'admin'
    ok = await updateRole(user.id, target)
  } else {
    ok = await deleteUser(user.id)
  }
  busy.value = false
  if (ok) {
    if (expandedId.value === user.id && type === 'delete') {
      expandedId.value = null
    }
    modal.value = null
  }
}

async function savePlan(detail: AdminUserDetail) {
  if (!plans.value.length) return
  planSaving.value = detail.id
  const slug = planSlugFor.value[detail.id] || detail.plan.slug
  const expires = expiresFor.value[detail.id] || null
  const ok = await assignPlan(detail.id, slug, expires)
  planSaving.value = null
  if (ok) {
    delete planSlugFor.value[detail.id]
    delete expiresFor.value[detail.id]
  }
}

function usagePercent(used: number, limit: number | null): string {
  if (limit === null) return '100%'
  if (limit === 0) return '0%'
  return `${Math.min(Math.round((used / limit) * 100), 100)}%`
}

function usageFor(detail: AdminUserDetail, key: string): { used: number; limit: number | null } {
  if (key === 'notes') return detail.usage.notes
  if (key === 'logEntries') return detail.usage.logEntries
  return detail.usage.attendances
}

const usageLabels: Record<string, string> = {
  notes: 'Notas',
  logEntries: 'Actividades',
  attendances: 'Asistencias',
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="actionError" class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-3">
      {{ actionError }}
    </div>

    <!-- Filtros -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQuery"
          placeholder="Buscar por nombre o correo..."
          class="w-full bg-overlay border border-border rounded-md pl-9 pr-3 py-2 text-sm text-text placeholder:text-text-disabled focus:outline-none focus:border-accent transition-colors"
        />
      </div>
      <select
        v-model="roleFilter"
        class="bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text-secondary focus:outline-none focus:border-accent transition-colors cursor-pointer"
      >
        <option value="all">Todos los roles</option>
        <option value="admin">Admin</option>
        <option value="user">Usuario</option>
      </select>
      <select
        v-model="statusFilter"
        class="bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text-secondary focus:outline-none focus:border-accent transition-colors cursor-pointer"
      >
        <option value="all">Todos los estados</option>
        <option value="active">Activos</option>
        <option value="inactive">Inactivos</option>
      </select>
    </div>

    <!-- Lista de usuarios -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-text-muted">
          {{ sortedUsers.length }} de {{ users.length }} usuario{{ users.length === 1 ? '' : 's' }}
        </p>
        <p v-if="!users.length" class="text-xs text-text-muted">Cargando...</p>
      </div>

      <div v-if="!users.length" class="flex items-center justify-center py-12">
        <div class="w-6 h-6 border-2 border-border-strong border-t-accent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="sortedUsers.length === 0" class="text-center py-12 bg-surface border border-border rounded-xl">
        <p class="text-text-muted text-sm">No hay usuarios que coincidan con la búsqueda.</p>
      </div>

      <div v-else class="space-y-2">
        <!-- Cabecera de columnas (desktop) -->
        <div class="hidden md:grid md:grid-cols-12 md:items-center md:gap-3 px-4 py-2">
          <button class="md:col-span-4 flex items-center gap-1 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted hover:text-text transition-colors" @click="setSort('name')">
            Usuario
            <svg class="w-3 h-3 transition-transform" :class="sortArrow('name')" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button class="text-right text-[11px] font-medium uppercase tracking-wider text-text-muted hover:text-text transition-colors flex items-center justify-end gap-1" @click="setSort('days')">
            Días
            <svg class="w-3 h-3 transition-transform" :class="sortArrow('days')" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button class="text-right text-[11px] font-medium uppercase tracking-wider text-text-muted hover:text-text transition-colors flex items-center justify-end gap-1" @click="setSort('hours')">
            Horas
            <svg class="w-3 h-3 transition-transform" :class="sortArrow('hours')" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button class="text-right text-[11px] font-medium uppercase tracking-wider text-text-muted hover:text-text transition-colors flex items-center justify-end gap-1" @click="setSort('attendances')">
            Asist.
            <svg class="w-3 h-3 transition-transform" :class="sortArrow('attendances')" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button class="text-right text-[11px] font-medium uppercase tracking-wider text-text-muted hover:text-text transition-colors flex items-center justify-end gap-1" @click="setSort('notes')">
            Notas
            <svg class="w-3 h-3 transition-transform" :class="sortArrow('notes')" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button class="text-right text-[11px] font-medium uppercase tracking-wider text-text-muted hover:text-text transition-colors flex items-center justify-end gap-1" @click="setSort('activities')">
            Act.
            <svg class="w-3 h-3 transition-transform" :class="sortArrow('activities')" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button class="md:col-span-2 text-right text-[11px] font-medium uppercase tracking-wider text-text-muted hover:text-text transition-colors flex items-center justify-end gap-1" @click="setSort('lastActivity')">
            Últ. actividad
            <svg class="w-3 h-3 transition-transform" :class="sortArrow('lastActivity')" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <span class="text-right text-[11px] font-medium uppercase tracking-wider text-text-muted">Detalle</span>
        </div>

        <div
          v-for="u in sortedUsers"
          :key="u.id"
          class="bg-surface border border-border rounded-xl transition-colors cursor-pointer hover:border-border-strong"
          :class="{ 'border-border-strong': expandedId === u.id }"
        >
          <div
            class="p-4 md:grid md:grid-cols-12 md:items-center md:gap-3"
            @click="toggleDetail(u)"
          >
            <!-- Identidad -->
            <div class="flex items-center gap-3 md:col-span-4 min-w-0">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                :class="u.role === 'admin' ? 'bg-warning/15 text-warning' : 'bg-accent/10 text-accent'"
              >
                {{ initials(u.fullName, u.email) }}
              </div>
              <div class="min-w-0 flex-1">
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
                    class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0"
                    :class="planBadgeClasses(u.plan?.slug || 'free')"
                  >
                    {{ u.plan?.name || 'Gratis' }}
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
              </div>
            </div>

            <!-- Stats desktop -->
            <div class="hidden md:block text-right md:col-span-1">
              <p class="text-sm font-semibold text-text">{{ u.completedDays }}</p>
            </div>
            <div class="hidden md:block text-right md:col-span-1">
              <p class="text-sm font-semibold text-text">{{ u.completedHours }}h</p>
            </div>
            <div class="hidden md:block text-right md:col-span-1">
              <p class="text-sm font-medium text-text-secondary">{{ u.attendanceCount }}</p>
            </div>
            <div class="hidden md:block text-right md:col-span-1">
              <p class="text-sm font-medium text-text-secondary">{{ u.notesCount }}</p>
            </div>
            <div class="hidden md:block text-right md:col-span-1">
              <p class="text-sm font-medium text-text-secondary">{{ u.logEntriesCount }}</p>
            </div>
            <div class="hidden md:block text-right md:col-span-2">
              <p class="text-xs text-text-secondary">{{ timeAgo(u.lastActivity) }}</p>
            </div>

            <div class="hidden md:flex md:col-span-1 justify-end">
              <svg
                class="w-5 h-5 text-text-muted transition-transform duration-200"
                :class="{ 'rotate-180': expandedId === u.id }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            <!-- Stats mobile -->
            <div class="md:hidden mt-3 grid grid-cols-4 gap-2">
              <div class="bg-overlay border border-border rounded-md p-2 text-center">
                <p class="text-sm font-semibold text-text">{{ u.completedDays }}</p>
                <p class="text-[10px] text-text-muted">Días</p>
              </div>
              <div class="bg-overlay border border-border rounded-md p-2 text-center">
                <p class="text-sm font-semibold text-text">{{ u.completedHours }}h</p>
                <p class="text-[10px] text-text-muted">Horas</p>
              </div>
              <div class="bg-overlay border border-border rounded-md p-2 text-center">
                <p class="text-sm font-medium text-text-secondary">{{ u.attendanceCount }}</p>
                <p class="text-[10px] text-text-muted">Asist.</p>
              </div>
              <div class="bg-overlay border border-border rounded-md p-2 text-center">
                <p class="text-sm font-medium text-text-secondary">{{ u.notesCount }} / {{ u.logEntriesCount }}</p>
                <p class="text-[10px] text-text-muted">Notas/Act.</p>
              </div>
            </div>
          </div>

          <!-- Panel de detalle expandido -->
          <div v-if="expandedId === u.id" class="border-t border-border px-4 pb-4 pt-4">
            <div v-if="detailLoadingId === u.id" class="flex items-center justify-center py-10">
              <div class="w-6 h-6 border-2 border-border-strong border-t-accent rounded-full animate-spin"></div>
            </div>

            <template v-else-if="detailFor(u.id)">
              <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                <p class="text-xs text-text-muted">
                  Alta: {{ formatDate(u.createdAt) }} · Última actividad: {{ timeAgo(u.lastActivity) }}
                </p>
                <div class="flex items-center gap-2">
                  <button
                    v-if="u.id !== currentUser?.id"
                    @click.stop="openRoleModal(u)"
                    class="inline-flex items-center gap-1.5 bg-overlay hover:bg-hover border border-border rounded-md px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text transition-colors"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Hacer {{ u.role === 'admin' ? 'usuario' : 'admin' }}
                  </button>
                  <button
                    v-if="u.id !== currentUser?.id"
                    @click.stop="openDeleteModal(u)"
                    class="inline-flex items-center gap-1.5 bg-error/10 hover:bg-error/20 border border-error/20 rounded-md px-3 py-1.5 text-xs font-medium text-error transition-colors"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar
                  </button>
                </div>
              </div>

              <!-- Plan del usuario -->
              <div class="bg-overlay border border-border rounded-lg p-4 mb-4">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h4 class="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">Plan</h4>
                    <p class="text-sm font-semibold text-text">{{ planNameFor(detailFor(u.id)!) }}</p>
                  </div>
                  <div class="flex flex-wrap items-end gap-2">
                    <div>
                      <label class="block text-[10px] text-text-muted mb-1">Cambiar plan</label>
                      <select
                        :value="planSlugFor[u.id] ?? detailFor(u.id)!.plan.slug"
                        @change="planSlugFor[u.id] = ($event.target as HTMLSelectElement).value"
                        class="bg-canvas border border-border rounded-md px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent transition-colors cursor-pointer"
                      >
                        <option v-for="p in plans" :key="p.id" :value="p.slug">{{ p.name }}</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-[10px] text-text-muted mb-1">Expira (opcional)</label>
                      <input
                        type="date"
                        :value="expiresFor[u.id] ?? ''"
                        @change="expiresFor[u.id] = ($event.target as HTMLInputElement).value"
                        class="bg-canvas border border-border rounded-md px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent transition-colors"
                      />
                    </div>
                    <button
                      @click="savePlan(detailFor(u.id)!)"
                      :disabled="planSaving === u.id"
                      class="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      <span v-if="planSaving === u.id" class="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                      Guardar plan
                    </button>
                  </div>
                </div>

                <div class="mt-4 space-y-3">
                  <div v-for="(key) in ['notes', 'logEntries', 'attendances']" :key="key" class="flex items-center gap-3">
                    <span class="w-28 text-xs text-text-muted flex-shrink-0">{{ usageLabels[key] }}</span>
                    <div class="flex-1 h-1.5 bg-hover rounded-full overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all duration-500"
                        :class="usageFor(detailFor(u.id)!, key).limit === null ? 'bg-neutral-500/40' : 'bg-accent'"
                        :style="{ width: usagePercent(usageFor(detailFor(u.id)!, key).used, usageFor(detailFor(u.id)!, key).limit) }"
                      ></div>
                    </div>
                    <span class="w-24 text-xs text-right text-text-secondary flex-shrink-0">
                      {{ usageFor(detailFor(u.id)!, key).used }} / {{ usageFor(detailFor(u.id)!, key).limit === null ? '∞' : usageFor(detailFor(u.id)!, key).limit }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="grid gap-4 lg:grid-cols-3">
                <!-- Progreso + ajustes -->
                <div class="space-y-4 lg:col-span-1">
                  <div class="bg-overlay border border-border rounded-lg p-4">
                    <div class="flex items-center justify-between text-xs mb-2">
                      <span class="text-text-muted">Progreso de horas</span>
                      <span class="text-text font-semibold">{{ detailFor(u.id)!.progress.percent }}%</span>
                    </div>
                    <div class="h-2 bg-hover rounded-full overflow-hidden">
                      <div
                        class="h-full bg-accent rounded-full transition-all duration-500"
                        :style="{ width: Math.min(detailFor(u.id)!.progress.percent, 100) + '%' }"
                      ></div>
                    </div>
                    <div class="mt-3 grid grid-cols-2 gap-2">
                      <div class="bg-canvas border border-border rounded-md p-2.5 text-center">
                        <p class="text-lg font-bold text-text leading-none">{{ detailFor(u.id)!.progress.completedHours }}h</p>
                        <p class="text-[10px] text-text-muted mt-1">de {{ detailFor(u.id)!.progress.totalHours }}h</p>
                      </div>
                      <div class="bg-canvas border border-border rounded-md p-2.5 text-center">
                        <p class="text-lg font-bold text-text leading-none">{{ detailFor(u.id)!.progress.completedDays }}</p>
                        <p class="text-[10px] text-text-muted mt-1">días completados</p>
                      </div>
                    </div>
                    <div class="mt-3 flex items-center justify-between text-xs">
                      <span class="inline-flex items-center gap-1 text-text-secondary">
                        <span class="w-2 h-2 rounded-full bg-accent"></span>
                        Presencial {{ detailFor(u.id)!.progress.onSiteDays }}
                      </span>
                      <span class="inline-flex items-center gap-1 text-text-secondary">
                        <span class="w-2 h-2 rounded-full bg-warning"></span>
                        Remoto {{ detailFor(u.id)!.progress.remoteDays }}
                      </span>
                      <span class="text-text-muted">Faltan {{ detailFor(u.id)!.progress.remainingDays }} días</span>
                    </div>
                  </div>

                  <div class="bg-overlay border border-border rounded-lg p-4">
                    <h4 class="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3">Ajustes</h4>
                    <template v-if="detailFor(u.id)!.settings">
                      <div class="space-y-2 text-xs">
                        <div class="flex justify-between">
                          <span class="text-text-muted">Período</span>
                          <span class="text-text-secondary text-right">
                            {{ formatShortDate(detailFor(u.id)!.settings!.startDate) }} →
                            {{ formatShortDate(detailFor(u.id)!.settings!.endDate) }}
                          </span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-text-muted">Horas / día</span>
                          <span class="text-text-secondary">{{ detailFor(u.id)!.settings!.workHoursPerDay ?? '—' }}</span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-text-muted">Días / semana</span>
                          <span class="text-text-secondary">{{ detailFor(u.id)!.settings!.daysPerWeek ?? '—' }}</span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-text-muted">Modalidad</span>
                          <span class="text-text-secondary">
                            {{ detailFor(u.id)!.settings!.workType === 'full' ? 'Tiempo completo' : detailFor(u.id)!.settings!.workType === 'partial' ? 'Medio tiempo' : '—' }}
                          </span>
                        </div>
                        <div v-if="detailFor(u.id)!.settings!.skippedWeeks?.length" class="flex justify-between">
                          <span class="text-text-muted">Semanas omitidas</span>
                          <span class="text-text-secondary">{{ detailFor(u.id)!.settings!.skippedWeeks!.join(', ') }}</span>
                        </div>
                      </div>
                    </template>
                    <p v-else class="text-xs text-text-muted">Sin ajustes configurados.</p>
                  </div>
                </div>

                <!-- Asistencias -->
                <div class="bg-overlay border border-border rounded-lg p-4 lg:col-span-1">
                  <div class="flex items-center justify-between mb-3">
                    <h4 class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Asistencias recientes</h4>
                    <span class="text-[11px] text-text-secondary">{{ detailFor(u.id)!.attendances.length }}</span>
                  </div>
                  <div v-if="detailFor(u.id)!.attendances.length" class="space-y-2 max-h-64 overflow-y-auto pr-1">
                    <div
                      v-for="a in detailFor(u.id)!.attendances.slice(0, 12)"
                      :key="a.id"
                      class="flex items-center justify-between gap-2 py-1.5 border-b border-border/50 last:border-0"
                    >
                      <div class="min-w-0">
                        <p class="text-sm text-text truncate">{{ formatDate(a.date) }}</p>
                        <p class="text-[10px] text-text-muted">
                          {{ a.isFullDay ? 'Jornada completa' : a.completedDay ? 'Parcial' : 'Incompleta' }}
                        </p>
                      </div>
                      <div class="flex items-center gap-2 flex-shrink-0">
                        <span
                          v-if="a.mode"
                          class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium"
                          :class="modeClasses[a.mode] || 'bg-neutral-500/10 text-neutral-400'"
                        >
                          {{ modeLabels[a.mode] || a.mode }}
                        </span>
                        <span class="text-sm font-semibold text-accent">{{ a.dayHours }}h</span>
                      </div>
                    </div>
                  </div>
                  <p v-else class="text-xs text-text-muted">Sin asistencias registradas.</p>
                </div>

                <!-- Actividades + notas -->
                <div class="space-y-4 lg:col-span-1">
                  <div class="bg-overlay border border-border rounded-lg p-4">
                    <div class="flex items-center justify-between mb-3">
                      <h4 class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Actividades recientes</h4>
                      <span class="text-[11px] text-text-secondary">{{ detailFor(u.id)!.logEntries.length }}</span>
                    </div>
                    <div v-if="detailFor(u.id)!.logEntries.length" class="space-y-2 max-h-40 overflow-y-auto pr-1">
                      <div
                        v-for="l in detailFor(u.id)!.logEntries.slice(0, 8)"
                        :key="l.id"
                        class="flex items-center justify-between gap-2 py-1.5 border-b border-border/50 last:border-0"
                      >
                        <div class="min-w-0">
                          <p class="text-sm text-text truncate">{{ l.name }}</p>
                          <p class="text-[10px] text-text-muted">
                            {{ formatShortDate(l.createdAt) }}<span v-if="l.week"> · Semana {{ l.week }}</span>
                          </p>
                        </div>
                        <span
                          class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
                          :class="statusPillClasses[l.status] || 'bg-neutral-500/10 text-neutral-400'"
                        >
                          {{ statusLabels[l.status] || l.status }}
                        </span>
                      </div>
                    </div>
                    <p v-else class="text-xs text-text-muted">Sin actividades registradas.</p>
                  </div>

                  <div class="bg-overlay border border-border rounded-lg p-4">
                    <div class="flex items-center justify-between mb-3">
                      <h4 class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Notas recientes</h4>
                      <span class="text-[11px] text-text-secondary">{{ detailFor(u.id)!.notes.length }}</span>
                    </div>
                    <div v-if="detailFor(u.id)!.notes.length" class="space-y-2 max-h-40 overflow-y-auto pr-1">
                      <div
                        v-for="n in detailFor(u.id)!.notes.slice(0, 8)"
                        :key="n.id"
                        class="py-1.5 border-b border-border/50 last:border-0"
                      >
                        <p class="text-sm text-text truncate">{{ n.title || n.content }}</p>
                        <p class="text-[10px] text-text-muted mt-0.5">
                          <span v-if="n.tag" class="text-accent">{{ n.tag }}</span>
                          <template v-if="n.tag"> · </template>
                          {{ formatShortDate(n.createdAt) }}
                        </p>
                      </div>
                    </div>
                    <p v-else class="text-xs text-text-muted">Sin notas registradas.</p>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de confirmación -->
    <Teleport to="body">
      <div
        v-if="modal"
        class="fixed inset-0 z-[60] overflow-y-auto bg-black/60 backdrop-blur-sm"
        @click="closeModal"
      >
        <div class="min-h-full flex items-center justify-center p-4 sm:p-6">
          <div
            class="bg-canvas border border-border rounded-lg w-full max-w-md shadow-2xl modal-open"
            @click.stop
          >
            <div class="p-6">
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                :class="modal.type === 'delete' ? 'bg-error/10 text-error' : 'bg-accent/10 text-accent'"
              >
                <svg v-if="modal.type === 'delete'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>

              <h2 class="text-lg font-semibold text-text">
                {{ modal.type === 'delete' ? 'Eliminar usuario' : 'Cambiar rol' }}
              </h2>

              <template v-if="modal.type === 'delete'">
                <p class="text-sm text-text-secondary mt-2">
                  ¿Seguro que quieres eliminar a
                  <span class="font-semibold text-text">{{ modal.user.fullName || modal.user.email }}</span>?
                  Se borrarán todas sus asistencias, notas y actividades. Esta acción no se puede deshacer.
                </p>
              </template>
              <template v-else>
                <p class="text-sm text-text-secondary mt-2">
                  ¿Convertir a
                  <span class="font-semibold text-text">{{ modal.user.fullName || modal.user.email }}</span>
                  en <span class="font-semibold text-text">{{ modal.user.role === 'admin' ? 'usuario' : 'administrador' }}</span>?
                </p>
              </template>

              <div v-if="actionError" class="mt-3 bg-error/10 border border-error/20 text-error text-sm rounded-md p-3">
                {{ actionError }}
              </div>

              <div class="mt-6 flex items-center justify-end gap-2">
                <button
                  @click="closeModal"
                  :disabled="busy"
                  class="px-4 py-2 rounded-md text-sm font-medium text-text-secondary hover:text-text hover:bg-overlay border border-border transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  @click="confirmModalAction"
                  :disabled="busy"
                  class="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                  :class="modal.type === 'delete'
                    ? 'bg-error hover:bg-error-hover'
                    : 'bg-accent hover:bg-accent-hover'"
                >
                  <span v-if="busy" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                  {{ modal.type === 'delete' ? 'Eliminar' : 'Cambiar rol' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
