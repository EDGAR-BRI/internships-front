<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSubscription } from '../composables/useSubscription'

interface LimitDetail {
  message?: string
  resource?: string
  used?: number
  limit?: number
}

const PAYMENT_INFO = {
  bank: 'Banesco',
  bankCode: '0134',
  ci: '31366298',
  phone: '0426-2498651',
  phoneIntl: '584262498651',
}

const { requesting, error, requestUpgrade } = useSubscription()

const isOpen = ref(false)
const detail = ref<LimitDetail | null>(null)
const sent = ref(false)
const copyFeedback = ref<Record<string, string>>({})

const amount = ref('3')
const reference = ref('')
const capture = ref<File | null>(null)

function close() {
  if (requesting.value) return
  isOpen.value = false
  sent.value = false
  detail.value = null
  copyFeedback.value = {}
  reference.value = ''
  capture.value = null
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

async function copyValue(key: string, value: string) {
  try {
    await navigator.clipboard.writeText(value)
    copyFeedback.value = { ...copyFeedback.value, [key]: '¡Copiado!' }
    setTimeout(() => {
      copyFeedback.value = { ...copyFeedback.value, [key]: '' }
    }, 1500)
  } catch {
    copyFeedback.value = { ...copyFeedback.value, [key]: 'No se pudo copiar' }
  }
}

async function copyAll() {
  const text = `${PAYMENT_INFO.bankCode}\n${PAYMENT_INFO.ci}\n${PAYMENT_INFO.phone}`
  await copyValue('all', text)
}

function onCaptureChange(e: Event) {
  const input = e.target as HTMLInputElement
  capture.value = input.files?.[0] || null
}

function whatsappMessage(): string {
  return (
    `¡Hola Edgar! 👋 Te envío mi pago para activar el Plan Pro.\n` +
    `Monto: $${amount.value || '3'}\n` +
    `Referencia: ${reference.value || '—'}\n` +
    `Cédula: ${PAYMENT_INFO.ci}\n` +
    `Banco: ${PAYMENT_INFO.bank}`
  )
}

async function openWhatsAppWithCapture() {
  const message = whatsappMessage()
  const file = capture.value

  const canShareFile =
    typeof navigator.share === 'function' &&
    !!file &&
    !!(navigator as any).canShare?.({ files: [file] })

  if (canShareFile) {
    try {
      await navigator.share({ files: [file], text: message })
      return
    } catch {
      /* el usuario canceló el share sheet; abrimos el chat */
    }
  }

  window.open(
    `https://wa.me/${PAYMENT_INFO.phoneIntl}?text=${encodeURIComponent(message)}`,
    '_blank'
  )
}

async function handleRequest() {
  const ok = await requestUpgrade()
  if (ok) {
    sent.value = true
    await openWhatsAppWithCapture()
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

            <h2 class="text-lg font-semibold text-text">¡Bríndale un tostón a Edgar! 🥐</h2>
            <p v-if="!sent" class="text-sm text-text-secondary mt-2">
              {{ detail?.message || 'Alcanzaste tu límite diario del plan Gratis.' }}
            </p>
            <p v-if="!sent" class="text-sm text-text-secondary mt-2">
              Actualiza a <span class="font-semibold text-accent">Plan Pro</span> (pago único).
              Haz tu pago móvil por el monto que quieras y envíame el comprobante.
            </p>

            <div
              v-if="sent"
              class="mt-3 bg-accent/10 border border-accent/20 text-accent text-sm rounded-md p-3"
            >
              Solicitud enviada. Te abrí WhatsApp para que me compartas el comprobante.
            </div>
            <div
              v-if="!sent && error"
              class="mt-3 bg-error/10 border border-error/20 text-error text-sm rounded-md p-3"
            >
              {{ error }}
            </div>

            <template v-if="!sent">
              <!-- Pago móvil -->
              <div class="mt-5 bg-surface border border-border rounded-lg p-4 space-y-2">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Pago Móvil
                </p>
                <button
                  @click="copyAll"
                  class="flex items-center gap-1.5 text-[11px] font-medium text-accent hover:underline"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  {{ copyFeedback['all'] || 'Copiar todo' }}
                </button>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-text-muted">Banco</span>
                  <span class="flex items-center gap-2">
                    <span class="text-text font-medium">{{ PAYMENT_INFO.bank }}</span>
                    <button
                      @click="copyValue('bank', PAYMENT_INFO.bankCode)"
                      class="text-[11px] font-medium text-accent hover:underline"
                    >
                      {{ copyFeedback['bank'] || 'Copiar' }}
                    </button>
                  </span>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-text-muted">Cédula</span>
                  <span class="flex items-center gap-2">
                    <span class="text-text font-medium">{{ PAYMENT_INFO.ci }}</span>
                    <button
                      @click="copyValue('ci', PAYMENT_INFO.ci)"
                      class="text-[11px] font-medium text-accent hover:underline"
                    >
                      {{ copyFeedback['ci'] || 'Copiar' }}
                    </button>
                  </span>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-text-muted">Teléfono</span>
                  <span class="flex items-center gap-2">
                    <span class="text-text font-medium">{{ PAYMENT_INFO.phone }}</span>
                    <button
                      @click="copyValue('phone', PAYMENT_INFO.phone)"
                      class="text-[11px] font-medium text-accent hover:underline"
                    >
                      {{ copyFeedback['phone'] || 'Copiar' }}
                    </button>
                  </span>
                </div>
                </div>

              <!-- Formulario del pago -->
              <div class="mt-5 space-y-3">
                <div class="space-y-1.5">
                  <label for="payment-reference" class="block text-xs font-medium text-text-secondary">
                    Referencia del pago
                  </label>
                  <input
                    id="payment-reference"
                    v-model="reference"
                    type="text"
                    placeholder="Número de referencia del banco"
                    class="w-full bg-overlay border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div class="space-y-1.5">
                  <label for="payment-capture" class="block text-xs font-medium text-text-secondary">
                    Captura del comprobante
                  </label>
                  <input
                    id="payment-capture"
                    type="file"
                    accept="image/*"
                    @change="onCaptureChange"
                    class="w-full text-sm text-text-muted file:mr-3 file:px-3 file:py-2 file:rounded-md file:border-0 file:bg-overlay file:text-accent file:text-sm file:font-medium hover:file:bg-hover focus:outline-none"
                  />
                </div>
              </div>

              <div class="mt-6 flex items-center justify-end gap-2">
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
                  Enviar y avisar por WhatsApp
                </button>
              </div>
            </template>

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