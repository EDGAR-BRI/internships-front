import { ref } from 'vue'
import { api } from '../lib/api'
import { useAuth } from './useAuth'

export interface Note {
  id: number
  userId: number
  logEntryId: number | null
  content: string
  createdAt: string
  updatedAt: string
}

export interface NoteFormData {
  content: string
  logEntryId: number | null
}

const notes = ref<Note[]>([])
const loading = ref(false)
const error = ref('')

export function useNotes() {
  const { token } = useAuth()

  async function fetchNotes() {
    loading.value = true
    error.value = ''
    try {
      const data = await api.get<{ notes: Note[] }>('/notes', token.value || undefined)
      notes.value = data.notes
    } catch (e: any) {
      error.value = e.message || 'Error al cargar notas'
    } finally {
      loading.value = false
    }
  }

  async function createNote(formData: NoteFormData) {
    error.value = ''
    try {
      const data = await api.post<{ note: Note }>(
        '/notes',
        { content: formData.content, logEntryId: formData.logEntryId ?? null },
        token.value || undefined
      )
      notes.value.unshift(data.note)
      return data.note
    } catch (e: any) {
      error.value = e.message || 'Error al crear nota'
      throw e
    }
  }

  async function updateNote(id: number, content: string) {
    error.value = ''
    try {
      const data = await api.put<{ note: Note }>(`/notes/${id}`, { content }, token.value || undefined)
      const index = notes.value.findIndex((n) => n.id === id)
      if (index !== -1) {
        notes.value[index] = data.note
      }
      return data.note
    } catch (e: any) {
      error.value = e.message || 'Error al actualizar nota'
      throw e
    }
  }

  async function deleteNote(id: number) {
    error.value = ''
    try {
      await api.delete(`/notes/${id}`, token.value || undefined)
      notes.value = notes.value.filter((n) => n.id !== id)
    } catch (e: any) {
      error.value = e.message || 'Error al eliminar nota'
      throw e
    }
  }

  return {
    notes,
    loading,
    error,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
  }
}
