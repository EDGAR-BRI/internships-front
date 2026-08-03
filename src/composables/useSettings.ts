import { ref } from 'vue'
import { api } from '../lib/api'

export interface UserSettings {
  id: number
  userId: number
  startDate: string
  endDate: string
  skippedWeeks: number[] | null
}

const settings = ref<UserSettings | null>(null)
const loading = ref(false)
const error = ref('')

export function useSettings(token?: string | null) {
  async function fetchSettings() {
    loading.value = true
    error.value = ''
    try {
      const data = await api.get<{ settings: UserSettings | null }>('/account/settings', token || undefined)
      settings.value = data.settings
    } catch (e: any) {
      error.value = e.message || 'Error al cargar configuración'
    } finally {
      loading.value = false
    }
  }

  async function updateSettings(data: {
    startDate: string
    endDate: string
    skippedWeeks?: number[]
  }) {
    error.value = ''
    try {
      const res = await api.put<{ settings: UserSettings }>('/account/settings', data, token || undefined)
      settings.value = res.settings
      return res.settings
    } catch (e: any) {
      error.value = e.message || 'Error al guardar configuración'
      throw e
    }
  }

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings,
  }
}
