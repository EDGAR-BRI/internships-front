<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAdmin, type Plan } from '../composables/useAdmin'

const {
  plans,
  plansLoading,
  actionError,
  fetchPlans,
  createPlan,
  updatePlan,
  deletePlan,
} = useAdmin()

const savingId = ref<number | null>(null)
const creating = ref(false)
const deletingId = ref<number | null>(null)

const limitFields = [
  { key: 'notesPerDay', label: 'Notas / día' },
  { key: 'logEntriesPerDay', label: 'Actividades / día' },
  { key: 'attendancesPerDay', label: 'Asistencias / día' },
  { key: 'attendancesPerDayFirstDay', label: 'Asistencias 1er día' },
] as const

const newPlan = ref({
  slug: '',
  name: '',
  notesPerDay: '',
  logEntriesPerDay: '',
  attendancesPerDay: '',
  attendancesPerDayFirstDay: '',
  canExport: true,
  isDefault: false,
})

const edits = ref<Record<number, Partial<Plan>>>({})

function editValue(plan: Plan, key: (typeof limitFields)[number]['key']): string {
  const edited = edits.value[plan.id]?.[key]
  if (edited !== undefined) return edited === null ? '' : String(edited)
  return plan[key] === null ? '' : String(plan[key])
}

function setValue(plan: Plan, key: (typeof limitFields)[number]['key'], value: string) {
  edits.value[plan.id] = {
    ...edits.value[plan.id],
    [key]: value === '' ? null : Number(value),
  }
}

function parseLimits(source: Record<string, any>) {
  return {
    notesPerDay: source.notesPerDay === '' ? null : Number(source.notesPerDay),
    logEntriesPerDay: source.logEntriesPerDay === '' ? null : Number(source.logEntriesPerDay),
    attendancesPerDay: source.attendancesPerDay === '' ? null : Number(source.attendancesPerDay),
    attendancesPerDayFirstDay:
      source.attendancesPerDayFirstDay === '' ? null : Number(source.attendancesPerDayFirstDay),
  }
}

async function handleCreate() {
  if (!newPlan.value.slug.trim() || !newPlan.value.name.trim()) return
  creating.value = true
  await createPlan({
    slug: newPlan.value.slug.trim(),
    name: newPlan.value.name.trim(),
    ...parseLimits(newPlan.value),
    canExport: newPlan.value.canExport,
    isDefault: newPlan.value.isDefault,
  })
  creating.value = false
  newPlan.value = {
    slug: '',
    name: '',
    notesPerDay: '',
    logEntriesPerDay: '',
    attendancesPerDay: '',
    attendancesPerDayFirstDay: '',
    canExport: true,
    isDefault: false,
  }
}

async function handleSave(plan: Plan) {
  savingId.value = plan.id
  const payload = edits.value[plan.id] || {}
  await updatePlan(plan.id, payload)
  savingId.value = null
  delete edits.value[plan.id]
}

async function handleDelete(plan: Plan) {
  if (plan.isDefault) return
  deletingId.value = plan.id
  await deletePlan(plan.id)
  deletingId.value = null
}

function toggleDefault(plan: Plan) {
  edits.value[plan.id] = { ...edits.value[plan.id], isDefault: true }
  handleSave(plan)
}

onMounted(() => {
  fetchPlans()
})
</script>

<template>
  <div class="space-y-6">
    <div v-if="actionError" class="bg-error/10 border border-error/20 text-error text-sm rounded-md p-3">
      {{ actionError }}
    </div>

    <!-- Nuevo plan -->
    <div class="bg-surface border border-border rounded-xl p-5">
      <h3 class="text-sm font-semibold text-text mb-4">Nuevo plan</h3>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label class="block text-xs text-text-muted mb-1">Slug</label>
          <input
            v-model="newPlan.slug"
            placeholder="pro_extra"
            class="w-full bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-disabled focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div>
          <label class="block text-xs text-text-muted mb-1">Nombre</label>
          <input
            v-model="newPlan.name"
            placeholder="Pro Extra"
            class="w-full bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-disabled focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div>
          <label class="block text-xs text-text-muted mb-1">Notas / día</label>
          <input
            v-model="newPlan.notesPerDay"
            type="number"
            min="0"
            placeholder="Ilimitado"
            class="w-full bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-disabled focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div>
          <label class="block text-xs text-text-muted mb-1">Actividades / día</label>
          <input
            v-model="newPlan.logEntriesPerDay"
            type="number"
            min="0"
            placeholder="Ilimitado"
            class="w-full bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-disabled focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div>
          <label class="block text-xs text-text-muted mb-1">Asistencias / día</label>
          <input
            v-model="newPlan.attendancesPerDay"
            type="number"
            min="0"
            placeholder="Ilimitado"
            class="w-full bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-disabled focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div>
          <label class="block text-xs text-text-muted mb-1">Asistencias 1er día</label>
          <input
            v-model="newPlan.attendancesPerDayFirstDay"
            type="number"
            min="0"
            placeholder="Ilimitado"
            class="w-full bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-disabled focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div class="flex items-end">
          <label class="flex items-center gap-2 text-sm text-text-secondary cursor-pointer pb-2">
            <input v-model="newPlan.canExport" type="checkbox" class="accent-[#0070f3]" />
            Puede exportar
          </label>
        </div>
        <div class="flex items-end">
          <label class="flex items-center gap-2 text-sm text-text-secondary cursor-pointer pb-2">
            <input v-model="newPlan.isDefault" type="checkbox" class="accent-[#0070f3]" />
            Plan por defecto
          </label>
        </div>
        <div class="flex items-end">
          <button
            @click="handleCreate"
            :disabled="creating || !newPlan.slug.trim() || !newPlan.name.trim()"
            class="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 w-full"
          >
            <span v-if="creating" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
            Crear plan
          </button>
        </div>
      </div>
      <p class="text-[11px] text-text-muted mt-2">Deja vacío para "ilimitado".</p>
    </div>

    <!-- Lista de planes -->
    <div v-if="plansLoading && plans.length === 0" class="flex items-center justify-center py-12">
      <div class="w-6 h-6 border-2 border-border-strong border-t-accent rounded-full animate-spin"></div>
    </div>

    <div v-else-if="plans.length === 0" class="text-center py-12 bg-surface border border-border rounded-xl">
      <p class="text-text-muted text-sm">No hay planes definidos.</p>
    </div>

    <div v-else class="grid gap-3 md:grid-cols-2">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="bg-surface border border-border rounded-xl p-5"
        :class="{ 'border-accent/40': plan.isDefault }"
      >
        <div class="flex items-center justify-between gap-2 mb-4">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-semibold text-text truncate">{{ plan.name }}</h3>
              <span
                class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0"
                :class="plan.isDefault ? 'bg-accent/10 text-accent border-accent/20' : 'bg-overlay text-text-secondary border-border'"
              >
                {{ plan.isDefault ? 'Por defecto' : plan.slug }}
              </span>
            </div>
          </div>
          <button
            v-if="!plan.isDefault"
            @click="handleDelete(plan)"
            :disabled="deletingId === plan.id"
            class="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-md transition-colors disabled:opacity-50"
            title="Eliminar plan"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div v-for="field in limitFields" :key="field.key">
            <label class="block text-[10px] text-text-muted mb-1">{{ field.label }}</label>
            <input
              type="number"
              min="0"
              :value="editValue(plan, field.key)"
              @change="setValue(plan, field.key, ($event.target as HTMLInputElement).value)"
              placeholder="Ilimitado"
              class="w-full bg-overlay border border-border rounded-md px-2.5 py-1.5 text-sm text-text placeholder:text-text-disabled focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between gap-2">
          <label class="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              :checked="edits[plan.id]?.canExport ?? plan.canExport"
              @change="edits[plan.id] = { ...edits[plan.id], canExport: ($event.target as HTMLInputElement).checked }"
              class="accent-[#0070f3]"
            />
            Puede exportar
          </label>
          <div class="flex items-center gap-2">
            <button
              v-if="!plan.isDefault"
              @click="toggleDefault(plan)"
              class="px-3 py-1.5 rounded-md text-xs font-medium text-text-secondary hover:text-text hover:bg-overlay border border-border transition-colors"
            >
              Hacer por defecto
            </button>
            <button
              @click="handleSave(plan)"
              :disabled="savingId === plan.id"
              class="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <span v-if="savingId === plan.id" class="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
