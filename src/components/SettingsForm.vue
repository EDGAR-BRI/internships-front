<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettings } from '../composables/useSettings'
import { useLogEntries } from '../composables/useLogEntries'
import { useAuth } from '../composables/useAuth'
import { useSubscription } from '../composables/useSubscription'
import { computeWeek } from '../utils/week'

const emit = defineEmits<{ saved: [] }>()

const { settings, error: settingsError, fetchSettings, updateSettings } = useSettings()
const { logEntries, fetchLogEntries, updateLogEntry } = useLogEntries()
const { mySubscription, fetchMySubscription } = useSubscription()

const startDate = ref('')
const endDate = ref('')
const ci = ref('')
const tutorName = ref('')
const skippedWeeksInput = ref('')
const workType = ref<'full' | 'partial' | ''>('')
const workHoursPerDay = ref<number | ''>('')
const daysPerWeek = ref<number | ''>('')
const workStartTime = ref('')
const workEndTime = ref('')
const workMorningEndTime = ref('')
const workAfternoonStartTime = ref('')
const geminiApiKey = ref('')
const aiSaving = ref(false)
const aiMessage = ref('')
const aiError = ref('')
const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

onMounted(async () => {
  await Promise.all([fetchSettings(), fetchMySubscription()])
  if (settings.value) {
    startDate.value = settings.value.startDate.slice(0, 10)
    endDate.value = settings.value.endDate.slice(0, 10)
    ci.value = settings.value.ci || ''
    tutorName.value = settings.value.tutorName || ''
    skippedWeeksInput.value = settings.value.skippedWeeks?.join(', ') || ''
    workType.value = settings.value.workType || ''
    workHoursPerDay.value = settings.value.workHoursPerDay ?? ''
    daysPerWeek.value = settings.value.daysPerWeek ?? 5
    workStartTime.value = settings.value.workStartTime || ''
    workEndTime.value = settings.value.workEndTime || ''
    workMorningEndTime.value = settings.value.workMorningEndTime || ''
    workAfternoonStartTime.value = settings.value.workAfternoonStartTime || ''
  }
})

function parseSkippedWeeks(input: string): number[] {
  return input
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0)
}

function requestUpgrade() {
  window.dispatchEvent(
    new CustomEvent('upgrade-offer', {
      detail: {
        message:
          'El autocompletado con IA está disponible en el plan Pro. Actualiza por $3 (pago único) para usarlo.',
      },
    })
  )
}

async function handleSaveGeminiKey() {
  aiMessage.value = ''
  aiError.value = ''
  if (!mySubscription.value?.canUseAi) {
    requestUpgrade()
    return
  }
  if (!geminiApiKey.value.trim()) {
    aiError.value = 'Ingresa tu API key de Gemini'
    return
  }
  aiSaving.value = true
  try {
    await updateSettings({
      startDate: startDate.value || '1970-01-01',
      endDate: endDate.value || '1970-01-02',
      geminiApiKey: geminiApiKey.value.trim(),
    })
    geminiApiKey.value = ''
    aiMessage.value = 'API key guardada. Ya puedes autocompletar tus actividades con IA.'
  } catch (e: any) {
    aiError.value = e.message || 'Error al guardar la API key'
  } finally {
    aiSaving.value = false
  }
}

async function handleClearGeminiKey() {
  aiMessage.value = ''
  aiError.value = ''
  aiSaving.value = true
  try {
    await updateSettings({
      startDate: startDate.value || '1970-01-01',
      endDate: endDate.value || '1970-01-02',
      geminiApiKey: '',
    })
    aiMessage.value = 'API key eliminada.'
  } catch (e: any) {
    aiError.value = e.message || 'Error al eliminar la API key'
  } finally {
    aiSaving.value = false
  }
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
    const payload: any = {
      startDate: startDate.value,
      endDate: endDate.value,
      ci: ci.value.trim(),
      tutorName: tutorName.value.trim(),
      skippedWeeks: skipped.length > 0 ? skipped : undefined,
    }
    if (workType.value) {
      payload.workType = workType.value
    }
    if (workType.value === 'partial') {
      payload.workHoursPerDay = Number(workHoursPerDay.value) || 8
    } else {
      payload.workHoursPerDay = 8
    }
    payload.daysPerWeek = Number(daysPerWeek.value) || 5
    if (workStartTime.value) payload.workStartTime = workStartTime.value
    if (workEndTime.value) payload.workEndTime = workEndTime.value
    if (workMorningEndTime.value) payload.workMorningEndTime = workMorningEndTime.value
    if (workAfternoonStartTime.value) payload.workAfternoonStartTime = workAfternoonStartTime.value
    await updateSettings(payload)

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
    emit('saved')
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
      <label for="ci" class="block text-sm font-medium text-text">
        C.I. (cédula de identidad) <span class="text-text-muted">(opcional)</span>
      </label>
      <input
        id="ci"
        v-model="ci"
        type="text"
        maxlength="50"
        placeholder="Ej. V-12.345.678"
        class="w-full box-border bg-surface border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
      <p class="text-xs text-text-muted">Se usa en la exportación del control de asistencia.</p>
    </div>

    <div class="space-y-1.5">
      <label for="tutor-name" class="block text-sm font-medium text-text">
        Nombre del tutor empresarial <span class="text-text-muted">(opcional)</span>
      </label>
      <input
        id="tutor-name"
        v-model="tutorName"
        type="text"
        maxlength="100"
        placeholder="Ing. Zandalio Zapata"
        class="w-full box-border bg-surface border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
      <p class="text-xs text-text-muted">Aparece en la línea del tutor en el control de asistencia exportado.</p>
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

    <div class="space-y-1.5">
      <label class="block text-sm font-medium text-text">Tipo de jornada</label>
      <div class="flex gap-2">
        <button
          type="button"
          @click="workType = 'full'"
          :class="workType === 'full' ? 'bg-accent text-white' : 'bg-overlay text-text-secondary hover:text-text'"
          class="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Día completo
        </button>
        <button
          type="button"
          @click="workType = 'partial'"
          :class="workType === 'partial' ? 'bg-accent text-white' : 'bg-overlay text-text-secondary hover:text-text'"
          class="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Parcial
        </button>
      </div>
    </div>

    <div v-if="workType === 'partial'" class="space-y-1.5">
      <label for="work-hours" class="block text-sm font-medium text-text">
        Horas por día <span class="text-error">*</span>
      </label>
      <input
        id="work-hours"
        v-model.number="workHoursPerDay"
        type="number"
        min="0.5"
        step="0.5"
        max="10"
        placeholder="Ej. 6.5"
        class="w-full box-border bg-surface border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
      <p class="text-xs text-text-muted">Cantidad de horas por defecto de tu jornada parcial (máximo 10h, permite decimales). Se usa para calcular el total y se pre-llena en el registro de asistencia.</p>
    </div>

    <div class="space-y-1.5">
      <label for="days-per-week" class="block text-sm font-medium text-text">
        Días de trabajo por semana
      </label>
      <input
        id="days-per-week"
        v-model.number="daysPerWeek"
        type="number"
        min="1"
        max="7"
        placeholder="Ej. 5"
        class="w-full box-border bg-surface border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
      <p class="text-xs text-text-muted">Cuántos días trabajas a la semana. Se usa para calcular la fecha de fin estimada.</p>
    </div>

    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1.5">
          <label for="work-start-time" class="block text-sm font-medium text-text">
            Entrada (mañana)
          </label>
          <input
            id="work-start-time"
            v-model="workStartTime"
            type="time"
            class="w-full box-border bg-surface border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
        <div class="space-y-1.5">
          <label for="work-morning-end-time" class="block text-sm font-medium text-text">
            Salida (mañana)
          </label>
          <input
            id="work-morning-end-time"
            v-model="workMorningEndTime"
            type="time"
            class="w-full box-border bg-surface border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
        <div class="space-y-1.5">
          <label for="work-afternoon-start-time" class="block text-sm font-medium text-text">
            Entrada (tarde)
          </label>
          <input
            id="work-afternoon-start-time"
            v-model="workAfternoonStartTime"
            type="time"
            class="w-full box-border bg-surface border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
        <div class="space-y-1.5">
          <label for="work-end-time" class="block text-sm font-medium text-text">
            Salida (tarde)
          </label>
          <input
            id="work-end-time"
            v-model="workEndTime"
            type="time"
            class="w-full box-border bg-surface border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>
      <p class="text-xs text-text-muted">
        Se usan en el reporte de asistencia. Si tienes doble jornada, completa también la salida de la
        mañana y la entrada de la tarde.
      </p>
    </div>

    <div class="border-t border-border pt-5 space-y-3">
      <div class="flex items-center justify-between">
        <label class="block text-sm font-medium text-text">IA — Autocompletado con Gemini</label>
        <span
          v-if="mySubscription?.canUseAi"
          class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent"
        >
          Disponible en tu plan
        </span>
      </div>

      <template v-if="mySubscription?.canUseAi">
        <p class="text-xs text-text-muted">
          El autocompletado usa las notas de cada actividad para redactar las teorías, aprendizajes,
          impacto y otros elementos. Obten tu API key gratis en
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            class="text-accent hover:underline"
          >aistudio.google.com/apikey</a>.
        </p>

        <div v-if="settings?.geminiApiKey" class="flex items-center justify-between gap-2 bg-overlay border border-border rounded-md px-3 py-2">
          <span class="text-sm text-text-secondary">
            API key configurada: <span class="font-mono">{{ settings.geminiApiKey }}</span>
          </span>
          <button
            type="button"
            :disabled="aiSaving"
            @click="handleClearGeminiKey"
            class="text-xs text-text-muted hover:text-error disabled:opacity-50 transition-colors"
          >
            Eliminar
          </button>
        </div>

        <div class="flex items-start gap-2">
          <input
            id="gemini-api-key"
            v-model="geminiApiKey"
            type="password"
            autocomplete="off"
            placeholder="Pega tu API key de Gemini"
            class="flex-1 min-w-0 box-border bg-surface border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <button
            type="button"
            :disabled="aiSaving"
            @click="handleSaveGeminiKey"
            class="bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 flex-shrink-0"
          >
            {{ aiSaving ? 'Guardando...' : 'Guardar key' }}
          </button>
        </div>

        <p v-if="aiMessage" class="text-xs text-accent">{{ aiMessage }}</p>
        <p v-if="aiError" class="text-xs text-error">{{ aiError }}</p>
      </template>

      <div v-else class="bg-overlay border border-border rounded-md p-3 space-y-2">
        <p class="text-sm text-text-secondary">
          El autocompletado con IA es una función del plan Pro. Actualiza por $3 (pago único) para
          configurar tu API key de Gemini y autocompletar tus actividades con IA.
        </p>
        <button
          type="button"
          @click="requestUpgrade"
          class="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150"
        >
          Actualizar al plan Pro
        </button>
      </div>
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
