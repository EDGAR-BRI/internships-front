<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useCommunity } from '../composables/useCommunity'
import { useAuth } from '../composables/useAuth'
import { tagLabel } from '../utils/noteTags'

const { ranking, notes, error, loading, notesLoading, fetchRanking, fetchNotes, addComment, deleteComment } =
  useCommunity()
const { user: me, restoreSession } = useAuth()

const activeTab = ref<'ranking' | 'notes'>('ranking')

const newComment = ref<Record<number, string>>({})
const sendingComment = ref<number | null>(null)
const commentError = ref('')

onMounted(() => {
  restoreSession()
  fetchRanking()
  fetchNotes()
})

const sortedNotes = computed(() =>
  [...notes.value].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
)

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function timeAgo(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days} día${days === 1 ? '' : 's'}`
  return formatDate(iso)
}

function initialsOf(name: string | null, email?: string): string {
  const source = name || email || '?'
  const [first, last] = source.split(' ')
  if (first && last) return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
  return first.slice(0, 2).toUpperCase()
}

function isMe(userId: number): boolean {
  return me.value?.id === userId
}

function medalFor(position: number): string {
  if (position === 1) return '🥇'
  if (position === 2) return '🥈'
  if (position === 3) return '🥉'
  return ''
}

async function handleAddComment(noteId: number) {
  const content = (newComment.value[noteId] || '').trim()
  if (!content) return
  sendingComment.value = noteId
  commentError.value = ''
  try {
    await addComment(noteId, content)
    newComment.value[noteId] = ''
  } catch (e: any) {
    commentError.value = e.message || 'Error al comentar'
  } finally {
    sendingComment.value = null
  }
}

async function handleDeleteComment(noteId: number, commentId: number) {
  try {
    await deleteComment(noteId, commentId)
  } catch (e: any) {
    commentError.value = e.message || 'Error al eliminar comentario'
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Comunidad</h1>
      <p class="text-text-muted text-sm mt-1">
        Ranking de asistencias y notas públicas de otros estudiantes de pasantía.
      </p>
    </div>

    <div v-if="error" class="bg-warning/10 border border-warning/20 text-warning text-sm rounded-md p-3">
      {{ error }}
    </div>

    <div class="flex items-center gap-2 border-b border-border pb-2">
      <button
        v-for="tab in [
          { value: 'ranking', label: 'Ranking' },
          { value: 'notes', label: 'Notas de la comunidad' },
        ]"
        :key="tab.value"
        @click="activeTab = tab.value"
        class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
        :class="activeTab === tab.value
          ? 'bg-accent text-white'
          : 'bg-overlay text-text-muted hover:text-text-secondary hover:bg-hover'"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- RANKING -->
    <div v-if="activeTab === 'ranking'">
      <div v-if="loading" class="text-sm text-text-muted">Cargando ranking...</div>
      <div v-else-if="ranking.length === 0" class="text-sm text-text-muted">
        Aún no hay participantes con perfil público.
      </div>
      <div v-else class="bg-surface border border-border rounded-lg overflow-hidden">
        <div class="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-border text-[11px] font-medium uppercase tracking-wider text-text-muted">
          <span class="col-span-1 text-center">#</span>
          <span class="col-span-5 sm:col-span-4">Estudiante</span>
          <span class="col-span-2 text-right">Días</span>
          <span class="col-span-2 text-right">Horas</span>
          <span class="col-span-2 text-right hidden sm:block">Racha</span>
        </div>
        <div
          v-for="entry in ranking"
          :key="entry.user.id"
          class="grid grid-cols-12 gap-2 items-center px-4 py-3 border-b border-border last:border-0"
          :class="entry.user.id === me?.id ? 'bg-accent/5' : ''"
        >
          <span class="col-span-1 text-center text-sm font-semibold text-text-secondary">
            {{ medalFor(entry.position) || entry.position }}
          </span>
          <div class="col-span-5 sm:col-span-4 flex items-center gap-2.5 min-w-0">
            <div
              v-if="entry.user.avatarUrl"
              class="w-8 h-8 rounded-full overflow-hidden ring-2 ring-accent/20 shrink-0"
            >
              <img :src="entry.user.avatarUrl" :alt="entry.user.fullName || ''" class="w-full h-full object-cover" />
            </div>
            <div
              v-else
              class="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-semibold ring-2 ring-accent/20 shrink-0"
            >
              {{ entry.user.initials }}
            </div>
            <span class="text-sm font-medium text-text truncate">
              {{ entry.user.fullName || 'Estudiante' }}
              <span v-if="entry.user.id === me?.id" class="text-[10px] text-accent">(tú)</span>
            </span>
          </div>
          <span class="col-span-2 text-right text-sm text-text">{{ entry.completedDays }}</span>
          <span class="col-span-2 text-right text-sm font-semibold text-text">{{ entry.completedHours }}h</span>
          <span class="col-span-2 text-right hidden sm:block">
            <span
              v-if="entry.streak > 0"
              class="inline-flex items-center gap-1 text-xs font-medium text-warning"
            >
              🔥 {{ entry.streak }}
            </span>
            <span v-else class="text-xs text-text-muted">—</span>
          </span>
        </div>
      </div>
    </div>

    <!-- NOTAS -->
    <div v-else class="space-y-4">
      <div v-if="notesLoading" class="text-sm text-text-muted">Cargando notas...</div>
      <div v-else-if="sortedNotes.length === 0" class="text-sm text-text-muted">
        Aún no hay notas públicas.
      </div>
      <div
        v-for="note in sortedNotes"
        :key="note.id"
        class="bg-surface border border-border rounded-lg p-4 space-y-3"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <div
              v-if="note.user.avatarUrl"
              class="w-8 h-8 rounded-full overflow-hidden ring-2 ring-accent/20 shrink-0"
            >
              <img :src="note.user.avatarUrl" :alt="note.user.fullName || ''" class="w-full h-full object-cover" />
            </div>
            <div
              v-else
              class="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-semibold ring-2 ring-accent/20 shrink-0"
            >
              {{ note.user.initials }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-text truncate">
                {{ note.user.fullName || 'Estudiante' }}
                <span v-if="note.user.id === me?.id" class="text-[10px] text-accent">(tú)</span>
              </p>
              <p class="text-[11px] text-text-muted">{{ timeAgo(note.createdAt) }}</p>
            </div>
          </div>
          <span class="shrink-0 text-[10px] font-medium uppercase tracking-wider text-accent bg-accent/10 px-2 py-1 rounded">
            {{ tagLabel(note.tag) }}
          </span>
        </div>

        <div class="space-y-1">
          <h3 class="text-sm font-semibold text-text">{{ note.title || 'Sin título' }}</h3>
          <p class="text-sm text-text-secondary whitespace-pre-wrap break-words">{{ note.content }}</p>
          <p v-if="note.date" class="text-[11px] text-text-muted">{{ formatDate(note.date) }}</p>
        </div>

        <!-- Comentarios -->
        <div class="pt-2 border-t border-border space-y-2">
          <div v-for="c in note.comments" :key="c.id" class="flex items-start gap-2">
            <span class="shrink-0 w-6 h-6 rounded-full bg-overlay text-text-muted flex items-center justify-center text-[10px] font-semibold">
              {{ c.user.initials }}
            </span>
            <div class="flex-1 min-w-0 bg-overlay border border-border rounded-md px-3 py-2">
              <p class="text-[11px] font-medium text-text">
                {{ c.user.fullName || 'Estudiante' }}
                <span class="text-text-muted font-normal">· {{ timeAgo(c.createdAt) }}</span>
              </p>
              <p class="text-xs text-text-secondary mt-0.5 break-words">{{ c.content }}</p>
            </div>
            <button
              v-if="c.mine"
              @click="handleDeleteComment(note.id, c.id)"
              class="shrink-0 text-text-muted hover:text-error transition-colors p-1"
              title="Eliminar comentario"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <div class="flex items-center gap-2">
            <input
              v-model="newComment[note.id]"
              type="text"
              placeholder="Escribe un comentario..."
              class="flex-1 min-w-0 bg-overlay border border-border rounded-md px-3 py-2 text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              @keyup.enter="handleAddComment(note.id)"
            />
            <button
              @click="handleAddComment(note.id)"
              :disabled="sendingComment === note.id || !newComment[note.id]?.trim()"
              class="shrink-0 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-2 rounded-md transition-colors"
            >
              {{ sendingComment === note.id ? 'Enviando...' : 'Comentar' }}
            </button>
          </div>
        </div>
      </div>
      <p v-if="commentError" class="text-xs text-error">{{ commentError }}</p>
    </div>
  </div>
</template>
