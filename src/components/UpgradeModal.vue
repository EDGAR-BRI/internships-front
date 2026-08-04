<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSubscription } from '../composables/useSubscription'

interface LimitDetail {
  message?: string
  resource?: string
  used?: number
  limit?: number
}

const { requesting, error, requestUpgrade } = useSubscription()

const isOpen = ref(false)
const detail = ref<LimitDetail | null>(null)
const sent = ref(false)

function close() {
  if (requesting.value) return
  isOpen.value = false
  sent.value = false
  detail.value = null
}

function onLimitReached(e: Event) {
  detail.value = (e as CustomEvent<LimitDetail>).detail || {}
  sent.value = false
  isOpen.value = true
}

function onUpgradeOffer(e: Event) {
  const offered = (e as CustomEvent<{ message?: string }>).detail
  detail.value = { message: offered?.message }
  sent.value = false
  isOpen.value = true
}

async function handleRequest() {
  const ok = await requestUpgrade()
  if (ok) {
    sent.value = true
  }
}

onMounted(() => {
  window.addEventListener('daily-limit-reached', onLimitReached)
  window.addEventListener('upgrade-offer', onUpgradeOffer)
})

onUnmounted(() => {
  window.removeEventListener('daily-limit-reached', onLimitReached)
  window.removeEventListener('upgrade-offer', onUpgradeOffer)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[70] overflow-y-auto bg-black/70 backdrop-blur-sm"
      @click="close"
    >
      <div class="min-h-full flex items-center justify-center p-4 sm:p-6">
        <div
          class="bg-canvas border border-border rounded-lg w-full max-w-md shadow-2xl modal-open"
          @click.stop
        >
          <div class="p-6">
            <div class="w-12 h-12 rounded-xl bg-accent/15 text-accent flex items-center justify-center mb-4">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>

            <h2 class="text-lg font-semibold text-text">Límite diario alcanzado</h2>
            <p v-if="!sent" class="text-sm text-text-secondary mt-2">
              {{ detail?.message || 'Alcanzaste tu límite diario del plan Gratis.' }}
            </p>
            <p v-if="!sent" class="text-sm text-text-secondary mt-2">
              Actualiza a <span class="font-semibold text-accent">Plan Pro</span> por
              <span class="font-semibold text-text">$3</span> (pago único) y registra sin límites.
            </p>

            <div
              v-if="sent"
              class="mt-3 bg-accent/10 border border-accent/20 text-accent text-sm rounded-md p-3"
            >
              Solicitud enviada. Un administrador revisará tu cambio a Pro.
            </div>
            <div
              v-if="!sent && error"
              class="mt-3 bg-error/10 border border-error/20 text-error text-sm rounded-md p-3"
            >
              {{ error }}
            </div>

            <div v-if="!sent" class="mt-6 flex items-center justify-end gap-2">
              <button
                @click="close"
                :disabled="requesting"
                class="px-4 py-2 rounded-md text-sm font-medium text-text-secondary hover:text-text hover:bg-overlay border border-border transition-colors disabled:opacity-50"
              >
                Ahora no
              </button>
              <button
                @click="handleRequest"
                :disabled="requesting"
                class="px-4 py-2 rounded-md text-sm font-medium text-white bg-accent hover:bg-accent-hover transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                <span v-if="requesting" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                Solicitar plan Pro
              </button>
            </div>

            <div v-else class="mt-6 flex justify-end">
              <button
                @click="close"
                class="px-4 py-2 rounded-md text-sm font-medium text-white bg-accent hover:bg-accent-hover transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
