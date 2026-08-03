<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettings } from '../composables/useSettings'
import { useLogEntries } from '../composables/useLogEntries'
import { useAuth } from '../composables/useAuth'
import { computeWeek } from '../utils/week'

const { token } = useAuth()
const { settings, error: settingsError, fetchSettings, updateSettings } = useSettings(token.value)
const { logEntries, fetchLogEntries, updateLogEntry } = useLogEntries()

const startDate = ref('')
const endDate = ref('')
const skippedWeeksInput = ref('')
const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

onMounted(async () => {
  await fetchSettings()
  if (settings.value) {
    startDate.value = settings.value.startDate.slice(0, 10)
    endDate.value = settings.value.endDate.slice(0, 10)
    skippedWeeksInput.value = settings.value.skippedWeeks?.join(', ') || ''
  }
})

function parseSkippedWeeks(input: string): number[] {
  return input
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0)
}

async function handleSubmit() {
  saveError.value = ''
  saveSuccess.value = false

  if (!startDate.value || !endDate.value) {
    saveError.value = 'Las fechas de inicio y fin son obligatorias'
    return
  }

  if (endDate.value <= startDate.value) {
    saveError.value = 'La fecha de fin debe ser posterior a la de inicio'
    return
  }

  saving.value = true

  try {
    const skipped = parseSkippedWeeks(skippedWeeksInput.value)
    await updateSettings({
      startDate: startDate.value,
      endDate: endDate.value,
      skippedWeeks: skipped.length > 0 ? skipped : undefined,
    })

    await fetchLogEntries()
    const updates = logEntries.value
      .filter((e) => e.datStart)
      .map((e) => {
        const week = computeWeek(startDate.value, e.datStart, skipped)
        return updateLogEntry(e.id, { week })
      })

    if (updates.length > 0) {
      await Promise.all(updates)
    }

    saveSuccess.value = true
  } catch (e: any) {
    saveError.value = e.message || 'Error al guardar'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6 max-w-lg">
    <div v-if="saveError" class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-3">
      {{ saveError }}
    </div>
    <div v-if="settingsError" class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-3">
      {{ settingsError }}
    </div>
    <div v-if="saveSuccess" class="bg-success/10 border border-success/20 text-accent text-sm rounded-md p-3">
      Configuración guardada y semanas recalculadas.
    </div>

    <div class="space-y-1.5">
      <label for="start-date" class="block text-sm font-medium text-text">
        Inicio de pasantía <span class="text-error">*</span>
      </label>
      <input
        id="start-date"
        v-model="startDate"
        type="date"
        class="w-full box-border bg-surface border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
    </div>

    <div class="space-y-1.5">
      <label for="end-date" class="block text-sm font-medium text-text">
        Fin de pasantía <span class="text-error">*</span>
      </label>
      <input
        id="end-date"
        v-model="endDate"
        type="date"
        class="w-full box-border bg-surface border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
    </div>

    <div class="space-y-1.5">
      <label for="skipped-weeks" class="block text-sm font-medium text-text">
        Semanas a omitir <span class="text-text-muted">(opcional)</span>
      </label>
      <input
        id="skipped-weeks"
        v-model="skippedWeeksInput"
        type="text"
        placeholder="Ej. 3, 7"
        class="w-full box-border bg-surface border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
      <p class="text-xs text-text-muted">Números de semana separados por coma. Estas semanas no se contarán.</p>
    </div>

    <button
      type="submit"
      :disabled="saving"
      class="bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-md text-sm font-medium transition-colors duration-150"
    >
      {{ saving ? 'Guardando...' : 'Guardar y recalcular semanas' }}
    </button>
  </form>
</template>
