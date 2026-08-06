import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api, OfflineQueuedError } from '../lib/api'
import { useAuthStore } from './useAuth'
import { registerReset, canPersist, persistStorage } from './registry'
import { isFresh } from './ttl'

export interface Note {
  id: number
  userId: number
  logEntryId: number | null
  title: string | null
  content: string
  tag: string
  date: string | null
  createdAt: string
  updatedAt: string
}

export interface NoteFormData {
  title: string | null
  content: string
  tag: string
  logEntryId: number | null
  date: string | null
}

export const useNotesStore = defineStore(
  'notes',
  () => {
    const notes = ref<Note[]>([])
    const loading = ref(false)
    const error = ref('')
    const lastFetched = ref(0)

    function touch() {
      lastFetched.value = Date.now()
    }

    async function fetchNotes() {
      const auth = useAuthStore()
      if (isFresh(lastFetched.value)) return

      const background = notes.value.length > 0
      if (!background) loading.value = true
      error.value = ''

      try {
        const data = await api.get<{ notes: Note[] }>('/notes', auth.token || undefined)
        notes.value = data.notes
        touch()
      } catch (e: any) {
        if (!background) error.value = e.message || 'Error al cargar notas'
      } finally {
        if (!background) loading.value = false
      }
    }

    function localNote(formData: NoteFormData): Note {
      const now = new Date().toISOString()
      return {
        id: -Date.now(),
        userId: 0,
        logEntryId: formData.logEntryId ?? null,
        title: formData.title ?? null,
        content: formData.content,
        tag: formData.tag,
        date: formData.date ?? null,
        createdAt: now,
        updatedAt: now,
      }
    }

    async function createNote(formData: NoteFormData) {
      const auth = useAuthStore()
      error.value = ''
      try {
        const data = await api.post<{ note: Note }>(
          '/notes',
          {
            title: formData.title ?? null,
            content: formData.content,
            tag: formData.tag,
            logEntryId: formData.logEntryId ?? null,
            date: formData.date ?? null,
          },
          auth.token || undefined
        )
        notes.value.unshift(data.note)
        touch()
        return data.note
      } catch (e: any) {
        if (e instanceof OfflineQueuedError) {
          notes.value.unshift(localNote(formData))
          touch()
          throw e
        }
        error.value = e.message || 'Error al crear nota'
        throw e
      }
    }

    async function updateNote(
      id: number,
      data: {
        title?: string | null
        content?: string
        tag?: string
        logEntryId?: number | null
        date?: string | null
      }
    ) {
      const auth = useAuthStore()
      error.value = ''
      try {
        const res = await api.put<{ note: Note }>(`/notes/${id}`, data, auth.token || undefined)
        const index = notes.value.findIndex((n) => n.id === id)
        if (index !== -1) {
          notes.value[index] = res.note
        }
        touch()
        return res.note
      } catch (e: any) {
        if (e instanceof OfflineQueuedError) {
          const index = notes.value.findIndex((n) => n.id === id)
          if (index !== -1) {
            notes.value[index] = { ...notes.value[index], ...data }
          }
          touch()
          throw e
        }
        error.value = e.message || 'Error al actualizar nota'
        throw e
      }
    }

    async function deleteNote(id: number) {
      const auth = useAuthStore()
      error.value = ''
      try {
        await api.delete(`/notes/${id}`, auth.token || undefined)
        notes.value = notes.value.filter((n) => n.id !== id)
        touch()
      } catch (e: any) {
        if (e instanceof OfflineQueuedError) {
          notes.value = notes.value.filter((n) => n.id !== id)
          touch()
          throw e
        }
        error.value = e.message || 'Error al eliminar nota'
        throw e
      }
    }

    function reset() {
      notes.value = []
      loading.value = false
      error.value = ''
      lastFetched.value = 0
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('sync-flushed', () => {
        lastFetched.value = 0
        fetchNotes()
      })
    }

    registerReset(reset)

    return {
      notes,
      loading,
      error,
      lastFetched,
      fetchNotes,
      createNote,
      updateNote,
      deleteNote,
      reset,
    }
  },
  {
    persist: canPersist
      ? {
          key: 'notes',
          storage: persistStorage!,
          pick: ['notes', 'lastFetched'],
        }
      : false,
  }
)
