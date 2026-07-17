import { ref, computed } from 'vue'
import { api } from '../lib/api'

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

  async function loadFromStorage() {
    if (typeof window === 'undefined') return

    const savedToken = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('auth_user')

    if (!savedToken || !savedUser) return

    token.value = savedToken
    user.value = JSON.parse(savedUser)

    try {
      loading.value = true
      const profile = await api.get<User>('/account/profile', savedToken)
      user.value = profile
      localStorage.setItem('auth_user', JSON.stringify(profile))
    } catch {
      logout()
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
    loadFromStorage,
    logout,
  }
}
