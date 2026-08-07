<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useCommunity } from '../composables/useCommunity'
import { useAuth } from '../composables/useAuth'
import { api } from '../lib/api'
import { tagLabel } from '../utils/noteTags'
import type { SearchResult, PublicProfile } from '../stores/useCommunity'

const { ranking, notes, error, loading, notesLoading, fetchRanking, fetchNotes, addComment, deleteComment, toggleReaction, toggleCommentReaction, searchUsers, fetchPublicProfile } =
  useCommunity()
const { user: me, token, restoreSession, updateUser } = useAuth()

const REACTION_EMOJIS = ['👍', '❤️', '🔥', '👏', '💡', '🎉', '😂', '😮', '🥇', '🚀']

const activeTab = ref<'ranking' | 'notes'>('ranking')

const newComment = ref<Record<number, string>>({})
const sendingComment = ref<number | null>(null)
const commentError = ref('')
const openPicker = ref<number | null>(null)
const openCommentPicker = ref<number | null>(null)
const feedSort = ref<'popular' | 'recent'>('popular')
const reactedIds = ref<Set<string>>(new Set())

function toggleEmojiPicker(noteId: number) {
  openPicker.value = openPicker.value === noteId ? null : noteId
  openCommentPicker.value = null
}

function toggleCommentEmojiPicker(commentId: number) {
  openCommentPicker.value = openCommentPicker.value === commentId ? null : commentId
  openPicker.value = null
}

function reactionKey(kind: string, id: number, emoji: string): string {
  return `${kind}:${id}:${emoji}`
}

function triggerPop(kind: string, id: number, emoji: string) {
  const key = reactionKey(kind, id, emoji)
  reactedIds.value = new Set(reactedIds.value)
  reactedIds.value.delete(key)
  reactedIds.value.add(key)
  setTimeout(() => {
    const next = new Set(reactedIds.value)
    next.delete(key)
    reactedIds.value = next
  }, 500)
}

function changeSort(sort: 'popular' | 'recent') {
  feedSort.value = sort
  fetchNotes(sort)
}

const visibilityModalOpen = ref(false)
const activatingVisibility = ref(false)
const visibilityError = ref('')

const searchQuery = ref('')
const searchResults = ref<SearchResult[]>([])
const searching = ref(false)
const searchError = ref('')
const profileModalOpen = ref(false)
const selectedProfile = ref<PublicProfile | null>(null)
const profileLoading = ref(false)

async function handleSearch() {
  const q = searchQuery.value.trim()
  if (!q) {
    searchResults.value = []
    return
  }
  searching.value = true
  searchError.value = ''
  try {
    searchResults.value = await searchUsers(q)
  } catch (e: any) {
    searchError.value = e.message || 'Error al buscar'
  } finally {
    searching.value = false
  }
}

async function openProfile(userId: number) {
  profileModalOpen.value = true
  profileLoading.value = true
  selectedProfile.value = null
  try {
    selectedProfile.value = await fetchPublicProfile(userId)
  } catch (e: any) {
    searchError.value = e.message || 'Error al cargar el perfil'
  } finally {
    profileLoading.value = false
  }
}

onMounted(() => {
  restoreSession()
  fetchRanking()
  fetchNotes()
  if (me.value && !me.value.profilePublic) {
    visibilityModalOpen.value = true
  }
})

async function activatePublicProfile() {
  activatingVisibility.value = true
  visibilityError.value = ''
  try {
    const res = await api.put<{ user: any }>(
      '/account/profile',
      { profilePublic: true },
      token.value || undefined
    )
    if (res.user) {
      updateUser(res.user)
    }
    visibilityModalOpen.value = false
    fetchRanking()
    fetchNotes()
  } catch (e: any) {
    visibilityError.value = e.message || 'Error al activar el perfil público'
  } finally {
    activatingVisibility.value = false
  }
}

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

async function handleToggleReaction(noteId: number, emoji: string) {
  try {
    await toggleReaction(noteId, emoji)
    triggerPop('note', noteId, emoji)
  } catch (e: any) {
    commentError.value = e.message || 'Error al reaccionar'
  }
}

async function handleToggleCommentReaction(noteId: number, commentId: number, emoji: string) {
  try {
    await toggleCommentReaction(noteId, commentId, emoji)
    triggerPop('comment', commentId, emoji)
  } catch (e: any) {
    commentError.value = e.message || 'Error al reaccionar'
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

    <!-- Buscador -->
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <div class="relative flex-1 max-w-md">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar estudiantes por nombre..."
            class="w-full bg-surface border border-border rounded-md pl-9 pr-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            @input="handleSearch"
          />
        </div>
        <span v-if="searching" class="text-xs text-text-muted">Buscando...</span>
      </div>
      <p v-if="searchError" class="text-xs text-error">{{ searchError }}</p>
      <div v-if="searchResults.length > 0" class="bg-surface border border-border rounded-lg overflow-hidden divide-y divide-border">
        <button
          v-for="u in searchResults"
          :key="u.id"
          @click="openProfile(u.id)"
          class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-hover transition-colors"
        >
          <div
            v-if="u.avatarUrl"
            class="w-9 h-9 rounded-full overflow-hidden ring-2 ring-accent/20 shrink-0"
          >
            <img :src="u.avatarUrl" :alt="u.fullName || ''" class="w-full h-full object-cover" />
          </div>
          <div
            v-else
            class="w-9 h-9 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-semibold ring-2 ring-accent/20 shrink-0"
          >
            {{ u.initials }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-text truncate">{{ u.fullName || 'Estudiante' }}</p>
            <p class="text-[11px] text-text-muted">
              <template v-if="u.isPrivate">
                <span class="inline-flex items-center gap-1">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Perfil privado
                </span>
              </template>
              <template v-else>
                {{ u.stats?.completedHours || 0 }}h · {{ u.stats?.completedDays || 0 }} días · {{ u.notesCount || 0 }} notas
              </template>
            </p>
          </div>
          <svg class="w-4 h-4 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
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
      <div class="flex items-center gap-1 bg-overlay border border-border rounded-md p-0.5 w-fit">
        <button
          @click="changeSort('popular')"
          class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
          :class="feedSort === 'popular' ? 'bg-accent text-white' : 'text-text-muted hover:text-text'"
        >
          🔥 Populares
        </button>
        <button
          @click="changeSort('recent')"
          class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
          :class="feedSort === 'recent' ? 'bg-accent text-white' : 'text-text-muted hover:text-text'"
        >
          Recientes
        </button>
      </div>
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

        <!-- Reacciones -->
        <div class="flex flex-wrap items-center gap-2.5">
          <span
            v-for="r in note.reactions"
            :key="r.emoji"
            class="reaction-chip inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors cursor-pointer select-none"
            :class="[
              r.reacted
                ? 'bg-accent/15 border-accent/50 text-text'
                : 'bg-overlay border-border text-text-secondary hover:border-accent/40',
              reactedIds.has(reactionKey('note', note.id, r.emoji)) ? 'reaction-pop' : '',
            ]"
            :title="`${r.reacted ? 'Quitar' : 'Reaccionar'} con ${r.emoji}`"
            @click="handleToggleReaction(note.id, r.emoji)"
          >
            <span class="reaction-emoji">{{ r.emoji }}</span>
            <span class="font-medium">{{ r.count }}</span>
          </span>

          <!-- Selector de emojis -->
          <div class="relative inline-flex">
            <button
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-border bg-overlay text-text-muted hover:text-text hover:border-accent/40 transition-colors"
              :title="'Agregar reacción'"
              @click="toggleEmojiPicker(note.id)"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-[11px]">Reaccionar</span>
            </button>
            <div
              v-if="openPicker === note.id"
              class="absolute left-0 bottom-full mb-1.5 grid grid-cols-5 gap-0.5 bg-surface border border-border-strong rounded-lg shadow-2xl px-1.5 py-1 z-10"
            >
              <button
                v-for="emoji in REACTION_EMOJIS"
                :key="emoji"
                class="w-8 h-8 flex items-center justify-center rounded-md text-lg hover:bg-hover transition-colors"
                :title="emoji"
                @click="handleToggleReaction(note.id, emoji); openPicker = null"
              >
                {{ emoji }}
              </button>
            </div>
          </div>
        </div>

        <!-- Comentarios -->
        <div class="pt-2 border-t border-border space-y-2">
          <div v-for="c in note.comments" :key="c.id" class="flex items-start gap-2">
            <span class="shrink-0 w-6 h-6 rounded-full bg-overlay text-text-muted flex items-center justify-center text-[10px] font-semibold">
              {{ c.user.initials }}
            </span>
            <div class="flex-1 min-w-0 space-y-1">
              <div class="bg-overlay border border-border rounded-md px-3 py-2">
                <p class="text-[11px] font-medium text-text">
                  {{ c.user.fullName || 'Estudiante' }}
                  <span class="text-text-muted font-normal">· {{ timeAgo(c.createdAt) }}</span>
                </p>
                <p class="text-xs text-text-secondary mt-0.5 break-words">{{ c.content }}</p>
              </div>
              <!-- Reacciones del comentario -->
              <div class="flex flex-wrap items-center gap-2 pl-1">
                <span
                  v-for="r in c.reactions"
                  :key="r.emoji"
                  class="reaction-chip inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-colors cursor-pointer select-none"
                  :class="[
                    r.reacted
                      ? 'bg-accent/15 border-accent/50 text-text'
                      : 'bg-overlay border-border text-text-muted hover:border-accent/40',
                    reactedIds.has(reactionKey('comment', c.id, r.emoji)) ? 'reaction-pop' : '',
                  ]"
                  :title="`${r.reacted ? 'Quitar' : 'Reaccionar'} con ${r.emoji}`"
                  @click="handleToggleCommentReaction(note.id, c.id, r.emoji)"
                >
                  <span class="reaction-emoji">{{ r.emoji }}</span>
                  <span class="font-medium">{{ r.count }}</span>
                </span>

                <div class="relative inline-flex">
                  <button
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border border-border bg-overlay text-text-muted hover:text-text hover:border-accent/40 transition-colors"
                    :title="'Reaccionar al comentario'"
                    @click="toggleCommentEmojiPicker(c.id)"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <div
                    v-if="openCommentPicker === c.id"
                    class="absolute left-0 bottom-full mb-1.5 grid grid-cols-5 gap-0.5 bg-surface border border-border-strong rounded-lg shadow-2xl px-1.5 py-1 z-10"
                  >
                    <button
                      v-for="emoji in REACTION_EMOJIS"
                      :key="emoji"
                      class="w-7 h-7 flex items-center justify-center rounded-md text-base hover:bg-hover transition-colors"
                      :title="emoji"
                      @click="handleToggleCommentReaction(note.id, c.id, emoji); openCommentPicker = null"
                    >
                      {{ emoji }}
                    </button>
                  </div>
                </div>
              </div>
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

    <!-- Modal visibilidad del perfil -->
    <Teleport to="body">
      <div
        v-if="visibilityModalOpen"
        class="fixed inset-0 z-[95] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div class="bg-canvas border border-border rounded-lg w-full max-w-md shadow-2xl p-6 space-y-4">
          <div class="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
            <svg class="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-text">Bienvenido a la comunidad</h2>
            <p class="text-sm text-text-muted mt-1 leading-relaxed">
              Para aparecer en el ranking y que otros estudiantes puedan ver y comentar tus notas,
              activa tu perfil público. Solo se mostrará tu nombre, nunca tu correo.
            </p>
          </div>
          <div v-if="visibilityError" class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-3">
            {{ visibilityError }}
          </div>
          <div class="flex gap-2 pt-1">
            <button
              @click="visibilityModalOpen = false"
              class="flex-1 bg-overlay hover:bg-hover text-text-secondary hover:text-text px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Ahora no
            </button>
            <button
              @click="activatePublicProfile"
              :disabled="activatingVisibility"
              class="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {{ activatingVisibility ? 'Activando...' : 'Activar perfil público' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal perfil de usuario -->
    <Teleport to="body">
      <div
        v-if="profileModalOpen"
        class="fixed inset-0 z-[95] overflow-y-auto bg-black/60 backdrop-blur-sm"
        @click="profileModalOpen = false"
      >
        <div class="min-h-full flex items-center justify-center p-4 sm:p-6">
          <div
            class="bg-canvas border border-border rounded-lg w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto"
            @click.stop
          >
            <div class="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <h2 class="text-lg font-semibold text-text">Perfil</h2>
              <button
                @click="profileModalOpen = false"
                class="text-text-muted hover:text-text transition-colors p-1.5 rounded-md hover:bg-hover"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div v-if="profileLoading" class="p-6 text-sm text-text-muted">Cargando perfil...</div>

            <div v-else-if="selectedProfile" class="overflow-y-auto p-6 space-y-5">
              <!-- Header -->
              <div class="flex items-center gap-4">
                <div
                  v-if="selectedProfile.user.avatarUrl"
                  class="w-14 h-14 rounded-full overflow-hidden ring-2 ring-accent/30 shrink-0"
                >
                  <img :src="selectedProfile.user.avatarUrl" :alt="selectedProfile.user.fullName || ''" class="w-full h-full object-cover" />
                </div>
                <div
                  v-else
                  class="w-14 h-14 rounded-full bg-accent/15 text-accent flex items-center justify-center text-lg font-semibold ring-2 ring-accent/30 shrink-0"
                >
                  {{ selectedProfile.user.initials }}
                </div>
                <div class="min-w-0">
                  <p class="text-base font-semibold text-text truncate">
                    {{ selectedProfile.user.fullName || 'Estudiante' }}
                  </p>
                  <p class="text-xs text-text-muted">
                    <template v-if="selectedProfile.isPrivate">
                      <span class="inline-flex items-center gap-1 text-warning">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Este perfil es privado
                      </span>
                    </template>
                    <template v-else>Perfil público</template>
                  </p>
                </div>
              </div>

              <!-- Perfil privado -->
              <div v-if="selectedProfile.isPrivate" class="bg-overlay border border-border rounded-lg p-4 text-center">
                <p class="text-sm text-text-muted">
                  Este estudiante tiene su perfil privado, así que sus estadísticas y notas no están disponibles.
                </p>
              </div>

              <!-- Perfil público: stats -->
              <div v-else>
                <h3 class="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">Estadísticas</h3>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div class="bg-surface border border-border rounded-lg p-3 text-center">
                    <p class="text-xl font-bold text-accent">{{ selectedProfile.stats.completedHours }}h</p>
                    <p class="text-[10px] font-medium uppercase tracking-wider text-text-muted mt-1">Horas</p>
                  </div>
                  <div class="bg-surface border border-border rounded-lg p-3 text-center">
                    <p class="text-xl font-bold text-text">{{ selectedProfile.stats.completedDays }}</p>
                    <p class="text-[10px] font-medium uppercase tracking-wider text-text-muted mt-1">Días</p>
                  </div>
                  <div class="bg-surface border border-border rounded-lg p-3 text-center">
                    <p class="text-xl font-bold text-accent">{{ selectedProfile.stats.onSiteDays }}</p>
                    <p class="text-[10px] font-medium uppercase tracking-wider text-text-muted mt-1">Presencial</p>
                  </div>
                  <div class="bg-surface border border-border rounded-lg p-3 text-center">
                    <p class="text-xl font-bold text-warning">{{ selectedProfile.stats.remoteDays }}</p>
                    <p class="text-[10px] font-medium uppercase tracking-wider text-text-muted mt-1">Remoto</p>
                  </div>
                </div>

                <!-- Notas públicas -->
                <h3 class="text-xs font-medium uppercase tracking-wider text-text-muted mt-5 mb-2">
                  Notas públicas ({{ selectedProfile.notes.length }})
                </h3>
                <div v-if="selectedProfile.notes.length === 0" class="text-sm text-text-muted">
                  Este estudiante aún no tiene notas públicas.
                </div>
                <div v-else class="space-y-3">
                  <div
                    v-for="n in selectedProfile.notes"
                    :key="n.id"
                    class="bg-surface border border-border rounded-lg p-3 space-y-1.5"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-sm font-semibold text-text truncate">{{ n.title || 'Sin título' }}</p>
                      <span class="shrink-0 text-[10px] font-medium uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded">
                        {{ tagLabel(n.tag) }}
                      </span>
                    </div>
                    <p class="text-xs text-text-secondary whitespace-pre-wrap break-words line-clamp-3">{{ n.content }}</p>
                    <p class="text-[11px] text-text-muted">
                      {{ formatDate(n.date) }}
                      <span v-if="n.comments.length">· {{ n.comments.length }} comentarios</span>
                      <span v-if="n.reactions.length">· {{ n.reactions.reduce((s, r) => s + r.count, 0) }} reacciones</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.reaction-chip .reaction-emoji {
  display: inline-block;
  transition: transform 0.15s ease;
}

.reaction-chip:active .reaction-emoji {
  transform: scale(1.35);
}

.reaction-chip.reaction-pop {
  animation: chip-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.reaction-chip.reaction-pop .reaction-emoji {
  animation: emoji-bounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes chip-pop {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.15);
    box-shadow: 0 0 0 3px var(--color-accent);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes emoji-bounce {
  0% {
    transform: scale(1) rotate(0deg);
  }
  40% {
    transform: scale(1.45) rotate(-12deg);
  }
  70% {
    transform: scale(0.9) rotate(8deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}
</style>
