import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api, ApiError } from '../lib/api'
import { resetAllStores } from './registry'

export interface AuthUser {
  id: number
  fullName: string | null
  email: string
  role: string
  avatarUrl: string | null
  initials?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const token = ref<string | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value)

  function setAuth(userData: AuthUser, authToken: string) {
    resetAllStores()
    user.value = userData
    token.value = authToken
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', authToken)
      localStorage.setItem('auth_user', JSON.stringify(userData))
    }
  }

  function restoreSession(): boolean {
    if (typeof window === 'undefined') return false

    const savedToken = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('auth_user')

    if (!savedToken || !savedUser) return false

    try {
      token.value = savedToken
      user.value = JSON.parse(savedUser)
      return true
    } catch {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      return false
    }
  }

  async function loadFromStorage() {
    if (typeof window === 'undefined') return

    const hadSession = restoreSession()
    if (!hadSession) return

    try {
      loading.value = true
      const profile = await api.get<AuthUser>('/account/profile', token.value!)
      user.value = profile
      localStorage.setItem('auth_user', JSON.stringify(profile))
    } catch (err) {
      const isUnauthorized = err instanceof ApiError && err.status === 401
      if (isUnauthorized) {
        logout()
      }
    } finally {
      loading.value = false
    }
  }

  function updateUser(data: Partial<AuthUser>) {
    if (!user.value) return
    user.value = { ...user.value, ...data }
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_user', JSON.stringify(user.value))
    }
  }

  async function logout() {    resetAllStores()
    if (token.value) {
      try {
        await api.post('/account/logout', {}, token.value)
      } catch {}
    }

    user.value = null
    token.value = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    }
  }

  return {
    user,
    token,
    loading,
    isAuthenticated,
    setAuth,
    restoreSession,
    loadFromStorage,
    updateUser,
    logout,
  }
})
