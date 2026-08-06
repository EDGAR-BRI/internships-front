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
}

export interface CommunityNote {
  id: number
  title: string | null
  content: string
  tag: string
  date: string | null
  createdAt: string
  user: CommunityUser
  comments: CommunityComment[]
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
  stats: {
    completedDays: number
    completedHours: number
    onSiteDays: number
    remoteDays: number
  }
  notes: Omit<CommunityNote, 'user'>[]
}

export const useCommunityStore = defineStore('community', () => {
  const ranking = ref<RankingEntry[]>([])
  const notes = ref<CommunityNote[]>([])
  const error = ref('')
  const loading = ref(false)
  const notesLoading = ref(false)

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

  async function fetchNotes() {
    const auth = useAuthStore()
    notesLoading.value = true
    error.value = ''
    try {
      const data = await api.get<{ notes: CommunityNote[]; error?: string }>(
        '/community/notes',
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
    reset,
  }
})
