import { toRef } from 'vue'
import pinia from '../stores/pinia'
import { useNotesStore, type Note, type NoteFormData } from '../stores/useNotes'

export type { Note, NoteFormData }

export function useNotes() {
  const store = useNotesStore(pinia)
  return {
    notes: toRef(store, 'notes'),
    loading: toRef(store, 'loading'),
    error: toRef(store, 'error'),
    fetchNotes: store.fetchNotes,
    createNote: store.createNote,
    updateNote: store.updateNote,
    deleteNote: store.deleteNote,
  }
}
