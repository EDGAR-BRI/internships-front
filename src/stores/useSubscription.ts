import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../lib/api'
import { useAuthStore } from './useAuth'
import { registerReset, canPersist, persistStorage } from './registry'
import { isFresh } from './ttl'

export interface MySubscription {
  planSlug: string
  planName: string
  canExport: boolean
  canExportAttendance: boolean
  canUseAi: boolean
  expiresAt: string | null
}

export const useSubscriptionStore = defineStore(
  'subscription',
  () => {
    const requesting = ref(false)
    const error = ref('')
    const mySubscription = ref<MySubscription | null>(null)
    const lastFetched = ref(0)

    async function fetchMySubscription() {
      const auth = useAuthStore()
      if (isFresh(lastFetched.value)) return

      try {
        const data = await api.get<{ subscription: MySubscription }>(
          '/account/subscription',
          auth.token || undefined
        )
        mySubscription.value = data.subscription
        lastFetched.value = Date.now()
        return data.subscription
      } catch (e: any) {
        error.value = e.message || 'No se pudo cargar tu plan'
        return null
      }
    }

    async function requestUpgrade(): Promise<boolean> {
      const auth = useAuthStore()
      requesting.value = true
      error.value = ''
      try {
        await api.post<{ upgradeRequest: unknown }>(
          '/account/subscription/upgrade-request',
          {},
          auth.token || undefined
        )
        return true
      } catch (e: any) {
        error.value = e.message || 'No se pudo enviar la solicitud'
        return false
      } finally {
        requesting.value = false
      }
    }

    function reset() {
      requesting.value = false
      error.value = ''
      mySubscription.value = null
      lastFetched.value = 0
    }

    registerReset(reset)

    return {
      requesting,
      error,
      mySubscription,
      lastFetched,
      fetchMySubscription,
      requestUpgrade,
      reset,
    }
  },
  {
    persist: canPersist
      ? {
          key: 'subscription',
          storage: persistStorage!,
          pick: ['mySubscription', 'lastFetched'],
        }
      : false,
  }
)
