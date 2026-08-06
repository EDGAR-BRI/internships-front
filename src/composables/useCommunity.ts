import { toRef } from 'vue'
import pinia from '../stores/pinia'
import { useCommunityStore } from '../stores/useCommunity'

export function useCommunity() {
  const store = useCommunityStore(pinia)
  return {
    ranking: toRef(store, 'ranking'),
    notes: toRef(store, 'notes'),
    error: toRef(store, 'error'),
    loading: toRef(store, 'loading'),
    notesLoading: toRef(store, 'notesLoading'),
    fetchRanking: store.fetchRanking,
    fetchNotes: store.fetchNotes,
    addComment: store.addComment,
    deleteComment: store.deleteComment,
  }
}
