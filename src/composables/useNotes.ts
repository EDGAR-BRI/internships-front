import { ref } from 'vue'
import { api } from '../lib/api'
import { useAuth } from './useAuth'

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
        { title: formData.title ?? null, content: formData.content, tag: formData.tag, logEntryId: formData.logEntryId ?? null, date: formData.date ?? null },
        token.value || undefined
      )
      notes.value.unshift(data.note)
      return data.note
    } catch (e: any) {
      error.value = e.message || 'Error al crear nota'
      throw e
    }
  }

  async function updateNote(id: number, data: { title?: string | null; content?: string; tag?: string; logEntryId?: number | null; date?: string | null }) {
    error.value = ''
    try {
      const res = await api.put<{ note: Note }>(`/notes/${id}`, data, token.value || undefined)
      const index = notes.value.findIndex((n) => n.id === id)
      if (index !== -1) {
        notes.value[index] = res.note
      }
      return res.note
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
