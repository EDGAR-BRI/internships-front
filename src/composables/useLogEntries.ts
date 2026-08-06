import { toRef } from 'vue'
import pinia from '../stores/pinia'
import { useLogEntriesStore, type LogEntry, type LogEntryFormData } from '../stores/useLogEntries'

export type { LogEntry, LogEntryFormData }

export function useLogEntries() {
  const store = useLogEntriesStore(pinia)
  return {
    logEntries: toRef(store, 'logEntries'),
    loading: toRef(store, 'loading'),
    error: toRef(store, 'error'),
    fetchLogEntries: store.fetchLogEntries,
    createLogEntry: store.createLogEntry,
    updateLogEntry: store.updateLogEntry,
    deleteLogEntry: store.deleteLogEntry,
  }
}
