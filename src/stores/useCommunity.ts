import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../lib/api'
import { useAuthStore } from './useAuth'
import { registerReset } from './registry'

export interface CommunityUser {
  id: number
  fullName: string | null
  avatarUrl: string | null
  initials: string
}

export interface CommunityComment {
  id: number
  content: string
  createdAt: string
  user: CommunityUser
  mine: boolean
  reactions: CommunityReaction[]
}

export interface CommunityReaction {
  emoji: string
  count: number
  reacted: boolean
}

export interface CommunityNote {
  id: number
  title: string | null
  content: string
  tag: string
  date: string | null
  createdAt: string
  popularity?: number
  user: CommunityUser
  comments: CommunityComment[]
  reactions: CommunityReaction[]
}

export interface RankingEntry {
  position: number
  user: CommunityUser
  completedDays: number
  completedHours: number
  onSiteDays: number
  remoteDays: number
  attendanceCount: number
  streak: number
}

export interface PublicProfile {
  user: CommunityUser
  isPrivate?: boolean
  stats: {
    completedDays: number
    completedHours: number
    onSiteDays: number
    remoteDays: number
    attendanceCount: number
  }
  notes: Omit<CommunityNote, 'user'>[]
}

export interface SearchResult {
  id: number
  fullName: string | null
  avatarUrl: string | null
  initials: string
  isPrivate: boolean
  stats?: PublicProfile['stats']
  notesCount?: number
}

export const useCommunityStore = defineStore('community', () => {
  const ranking = ref<RankingEntry[]>([])
  const notes = ref<CommunityNote[]>([])
  const error = ref('')
  const loading = ref(false)
  const notesLoading = ref(false)

  async function searchUsers(q: string): Promise<SearchResult[]> {
    const auth = useAuthStore()
    const data = await api.get<{ users: SearchResult[]; error?: string }>(
      `/community/search?q=${encodeURIComponent(q)}`,
      auth.token || undefined
    )
    if (data.error) error.value = data.error
    return data.users || []
  }

  async function fetchPublicProfile(id: number): Promise<PublicProfile | null> {
    const auth = useAuthStore()
    const data = await api.get<{ user: PublicProfile['user'] | null; isPrivate?: boolean; stats?: PublicProfile['stats']; notes?: PublicProfile['notes']; error?: string }>(
      `/community/users/${id}`,
      auth.token || undefined
    )
    if (data.error) {
      error.value = data.error
      return null
    }
    if (!data.user) return null
    return {
      user: data.user,
      isPrivate: data.isPrivate,
      stats: data.stats || { completedDays: 0, completedHours: 0, onSiteDays: 0, remoteDays: 0, attendanceCount: 0 },
      notes: data.notes || [],
    }
  }

  async function fetchRanking() {
    const auth = useAuthStore()
    loading.value = true
    error.value = ''
    try {
      const data = await api.get<{ ranking: RankingEntry[]; error?: string }>(
        '/community/ranking',
        auth.token || undefined
      )
      ranking.value = data.ranking || []
      if (data.error) error.value = data.error
    } catch (e: any) {
      error.value = e.message || 'Error al cargar el ranking'
    } finally {
      loading.value = false
    }
  }

  async function fetchNotes(sort: 'popular' | 'recent' = 'popular') {
    const auth = useAuthStore()
    notesLoading.value = true
    error.value = ''
    try {
      const data = await api.get<{ notes: CommunityNote[]; error?: string }>(
        `/community/notes?sort=${sort}`,
        auth.token || undefined
      )
      notes.value = data.notes || []
      if (data.error) error.value = data.error
    } catch (e: any) {
      error.value = e.message || 'Error al cargar notas'
    } finally {
      notesLoading.value = false
    }
  }

  async function addComment(noteId: number, content: string): Promise<CommunityComment> {
    const auth = useAuthStore()
    const data = await api.post<{ comment: CommunityComment }>(
      `/community/notes/${noteId}/comments`,
      { content },
      auth.token || undefined
    )
    const note = notes.value.find((n) => n.id === noteId)
    if (note) {
      note.comments.push(data.comment)
    }
    return data.comment
  }

  async function deleteComment(noteId: number, commentId: number) {
    const auth = useAuthStore()
    await api.delete(`/community/comments/${commentId}`, auth.token || undefined)
    const note = notes.value.find((n) => n.id === noteId)
    if (note) {
      note.comments = note.comments.filter((c) => c.id !== commentId)
    }
  }

  async function toggleReaction(noteId: number, emoji: string): Promise<CommunityReaction[]> {
    const auth = useAuthStore()
    const data = await api.post<{ reactions: CommunityReaction[] }>(
      `/community/notes/${noteId}/reactions`,
      { emoji },
      auth.token || undefined
    )
    const note = notes.value.find((n) => n.id === noteId)
    if (note) {
      note.reactions = data.reactions || []
    }
    return data.reactions || []
  }

  async function toggleCommentReaction(
    noteId: number,
    commentId: number,
    emoji: string
  ): Promise<CommunityReaction[]> {
    const auth = useAuthStore()
    const data = await api.post<{ reactions: CommunityReaction[] }>(
      `/community/comments/${commentId}/reactions`,
      { emoji },
      auth.token || undefined
    )
    const note = notes.value.find((n) => n.id === noteId)
    const comment = note?.comments.find((c) => c.id === commentId)
    if (comment) {
      comment.reactions = data.reactions || []
    }
    return data.reactions || []
  }

  function reset() {
    ranking.value = []
    notes.value = []
    error.value = ''
    loading.value = false
    notesLoading.value = false
  }

  registerReset(reset)

  return {
    ranking,
    notes,
    error,
    loading,
    notesLoading,
    fetchRanking,
    fetchNotes,
    addComment,
    deleteComment,
    toggleReaction,
    toggleCommentReaction,
    searchUsers,
    fetchPublicProfile,
    reset,
  }
})
