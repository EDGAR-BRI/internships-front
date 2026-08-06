import { toRef } from 'vue'
import pinia from '../stores/pinia'
import { useAuthStore, type AuthUser } from '../stores/useAuth'

export type User = AuthUser

export function useAuth() {
  const store = useAuthStore(pinia)
  return {
    user: toRef(store, 'user'),
    token: toRef(store, 'token'),
    loading: toRef(store, 'loading'),
    isAuthenticated: toRef(store, 'isAuthenticated'),
    setAuth: store.setAuth,
    restoreSession: store.restoreSession,
    loadFromStorage: store.loadFromStorage,
    updateUser: store.updateUser,
    logout: store.logout,
  }
}
