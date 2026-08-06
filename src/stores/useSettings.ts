import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api, OfflineQueuedError } from '../lib/api'
import { useAuthStore } from './useAuth'
import { registerReset, canPersist, persistStorage } from './registry'
import { isFresh } from './ttl'

export interface UserSettings {
  id: number
  userId: number
  startDate: string
  endDate: string
  skippedWeeks: number[] | null
  workType: 'full' | 'partial' | null
  workHoursPerDay: number | null
  daysPerWeek: number | null
  workStartTime: string | null
  workEndTime: string | null
}

export const useSettingsStore = defineStore(
  'settings',
  () => {
    const settings = ref<UserSettings | null>(null)
    const loading = ref(false)
    const error = ref('')
    const lastFetched = ref(0)

    async function fetchSettings() {
      const auth = useAuthStore()
      if (isFresh(lastFetched.value)) return

      const background = settings.value !== null
      if (!background) loading.value = true
      error.value = ''

      try {
        const data = await api.get<{ settings: UserSettings | null }>(
          '/account/settings',
          auth.token || undefined
        )
        settings.value = data.settings
        lastFetched.value = Date.now()
      } catch (e: any) {
        if (!background) error.value = e.message || 'Error al cargar configuración'
      } finally {
        if (!background) loading.value = false
      }
    }

    async function updateSettings(data: {
      startDate: string
      endDate: string
      skippedWeeks?: number[]
      workStartTime?: string | null
      workEndTime?: string | null
    }) {
      const auth = useAuthStore()
      error.value = ''
      try {
        const res = await api.put<{ settings: UserSettings }>(
          '/account/settings',
          data,
          auth.token || undefined
        )
        settings.value = res.settings
        lastFetched.value = Date.now()
        return res.settings
      } catch (e: any) {
        if (e instanceof OfflineQueuedError) {
          if (settings.value) {
            settings.value = { ...settings.value, ...data }
          }
          lastFetched.value = Date.now()
          throw e
        }
        error.value = e.message || 'Error al guardar configuración'
        throw e
      }
    }

    function reset() {
      settings.value = null
      loading.value = false
      error.value = ''
      lastFetched.value = 0
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('sync-flushed', () => {
        lastFetched.value = 0
        fetchSettings()
      })
    }

    registerReset(reset)

    return {
      settings,
      loading,
      error,
      lastFetched,
      fetchSettings,
      updateSettings,
      reset,
    }
  },
  {
    persist: canPersist
      ? {
          key: 'settings',
          storage: persistStorage!,
          pick: ['settings', 'lastFetched'],
        }
      : false,
  }
)
