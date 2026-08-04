<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAdmin, type UpgradeRequest } from '../composables/useAdmin'

const emit = defineEmits<{
  changed: []
}>()

const {
  upgradeRequests,
  requestsLoading,
  actionError,
  fetchUpgradeRequests,
  approveUpgradeRequest,
  rejectUpgradeRequest,
} = useAdmin()

const pending = computed(() => upgradeRequests.value.filter((r) => r.status === 'pending'))
const resolved = computed(() => upgradeRequests.value.filter((r) => r.status !== 'pending'))

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
    hour: '2-digit',
    minute: '2-digit',
  })
}

const statusBadges: Record<string, string> = {
  approved: 'bg-accent/10 text-accent',
  rejected: 'bg-error/10 text-error',
}

const statusLabels: Record<string, string> = {
  approved: 'Aprobada',
  rejected: 'Rechazada',
}

async function handleApprove(r: UpgradeRequest) {
  const ok = await approveUpgradeRequest(r.id)
  if (ok) emit('changed')
}

async function handleReject(r: UpgradeRequest) {
  const ok = await rejectUpgradeRequest(r.id)
  if (ok) emit('changed')
}

onMounted(() => {
  fetchUpgradeRequests()
})
</script>

<template>
  <div class="space-y-6">
    <div v-if="actionError" class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-3">
      {{ actionError }}
    </div>

    <div v-if="requestsLoading && upgradeRequests.length === 0" class="flex items-center justify-center py-12">
      <div class="w-6 h-6 border-2 border-border-strong border-t-accent rounded-full animate-spin"></div>
    </div>

    <div v-else-if="upgradeRequests.length === 0" class="text-center py-12 bg-surface border border-border rounded-xl">
      <p class="text-text-muted text-sm">No hay solicitudes de cambio de plan.</p>
    </div>

    <template v-else>
      <!-- Pendientes -->
      <div v-if="pending.length">
        <h3 class="text-sm font-semibold text-text mb-3">Pendientes ({{ pending.length }})</h3>
        <div class="space-y-2">
          <div
            v-for="r in pending"
            :key="r.id"
            class="bg-surface border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div
              class="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold flex-shrink-0"
            >
              {{ initials(r.user.fullName, r.user.email) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-text truncate">{{ r.user.fullName || 'Sin nombre' }}</p>
              <p class="text-xs text-text-muted truncate">{{ r.user.email }}</p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <span class="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-accent/10 text-accent border border-accent/20">
                → {{ r.planSlug === 'pro' ? 'Pro' : r.planSlug }}
              </span>
              <span class="text-xs text-text-muted">{{ formatDate(r.createdAt) }}</span>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button
                @click="handleApprove(r)"
                class="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Aprobar
              </button>
              <button
                @click="handleReject(r)"
                class="inline-flex items-center gap-1.5 bg-error/10 hover:bg-error/20 border border-error/20 rounded-md px-3 py-1.5 text-xs font-medium text-error transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Rechazar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Resueltas -->
      <div v-if="resolved.length">
        <h3 class="text-sm font-semibold text-text mb-3">Resueltas</h3>
        <div class="space-y-2">
          <div
            v-for="r in resolved"
            :key="r.id"
            class="bg-surface border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 opacity-70"
          >
            <div
              class="w-10 h-10 rounded-full bg-neutral-500/10 text-text-secondary flex items-center justify-center text-xs font-semibold flex-shrink-0"
            >
              {{ initials(r.user.fullName, r.user.email) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-text truncate">{{ r.user.fullName || 'Sin nombre' }}</p>
              <p class="text-xs text-text-muted truncate">{{ r.user.email }}</p>
            </div>
            <span
              class="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium"
              :class="statusBadges[r.status] || 'bg-neutral-500/10 text-neutral-400'"
            >
              {{ statusLabels[r.status] || r.status }}
            </span>
            <span class="text-xs text-text-muted">{{ formatDate(r.createdAt) }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
