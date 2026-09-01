<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const STORAGE_KEY = 'attendance:export-iujo-notice'

const props = withDefaults(
  defineProps<{
    enabled?: boolean
  }>(),
  { enabled: true }
)

const open = ref(false)

function close() {
  open.value = false
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, '1')
  }
}

function maybeShow() {
  if (!props.enabled || open.value) return
  if (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) return
  open.value = true
}

onMounted(() => {
  if (!props.enabled) return
  const timer = setTimeout(maybeShow, 700)
  const cancel = () => clearTimeout(timer)
  window.addEventListener('beforeunload', cancel)
})

watch(
  () => props.enabled,
  (val) => {
    if (val) maybeShow()
  }
)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-[70] overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        @click="close"
      >
        <div
          class="bg-canvas border border-border rounded-lg w-full max-w-sm shadow-2xl p-6 space-y-4"
          @click.stop
        >
          <div class="w-12 h-12 rounded-xl bg-accent/15 text-accent flex items-center justify-center mb-1">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <h3 class="text-lg font-semibold text-text">Exportar en formato IUJO</h3>
          <p class="text-sm text-text-secondary">
            Ahora puedes exportar las asistencias en el formato para el IUJO.
          </p>

          <div class="flex justify-end">
            <button
              @click="close"
              class="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>