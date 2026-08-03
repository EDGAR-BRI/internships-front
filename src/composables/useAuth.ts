import { ref, computed } from 'vue'
import { api, ApiError } from '../lib/api'

interface User {
  id: number
  fullName: string | null
  email: string
}

const user = ref<User | null>(null)
const token = ref<string | null>(null)
const loading = ref(false)

export function useAuth() {
  const isAuthenticated = computed(() => !!token.value)

  function setAuth(userData: User, authToken: string) {
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
      const profile = await api.get<User>('/account/profile', token.value!)
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

  async function logout() {
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
    logout,
  }
}
