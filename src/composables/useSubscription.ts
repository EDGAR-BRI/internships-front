import { ref } from 'vue'
import { api } from '../lib/api'
import { useAuth } from './useAuth'

export interface MySubscription {
  planSlug: string
  planName: string
  canExport: boolean
  expiresAt: string | null
}

const requesting = ref(false)
const error = ref('')
const mySubscription = ref<MySubscription | null>(null)

export function useSubscription() {
  const { token } = useAuth()

  async function fetchMySubscription(): Promise<MySubscription | null> {
    try {
      const data = await api.get<{ subscription: MySubscription }>(
        '/account/subscription',
        token.value || undefined
      )
      mySubscription.value = data.subscription
      return data.subscription
    } catch (e: any) {
      error.value = e.message || 'No se pudo cargar tu plan'
      return null
    }
  }

  async function requestUpgrade(): Promise<boolean> {
    requesting.value = true
    error.value = ''
    try {
      await api.post<{ upgradeRequest: unknown }>(
        '/account/subscription/upgrade-request',
        {},
        token.value || undefined
      )
      return true
    } catch (e: any) {
      error.value = e.message || 'No se pudo enviar la solicitud'
      return false
    } finally {
      requesting.value = false
    }
  }

  return {
    requesting,
    error,
    mySubscription,
    fetchMySubscription,
    requestUpgrade,
  }
}
