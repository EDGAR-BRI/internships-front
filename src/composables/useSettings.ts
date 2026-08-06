import { toRef } from 'vue'
import pinia from '../stores/pinia'
import { useSettingsStore, type UserSettings } from '../stores/useSettings'

export type { UserSettings }

export function useSettings() {
  const store = useSettingsStore(pinia)
  return {
    settings: toRef(store, 'settings'),
    loading: toRef(store, 'loading'),
    error: toRef(store, 'error'),
    fetchSettings: store.fetchSettings,
    updateSettings: store.updateSettings,
  }
}
