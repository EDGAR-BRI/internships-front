<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'pwa_install_dismissed'

const visible = ref(false)
const canInstall = ref(false)
const showIos = ref(false)
const showManual = ref(false)
const installEvent = ref<BeforeInstallPromptEvent | null>(null)

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  )
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isDesktop(): boolean {
  return !/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
}

function maybeShow() {
  if (isStandalone()) return
  if (typeof localStorage !== 'undefined' && localStorage.getItem(DISMISS_KEY)) return

  if (isIos()) {
    showIos.value = true
    showManual.value = false
    visible.value = true
  } else if (canInstall.value) {
    showIos.value = false
    showManual.value = false
    visible.value = true
  } else {
    // Sin evento beforeinstallprompt (Chrome no siempre lo dispara): mostrar guía manual
    showIos.value = false
    showManual.value = true
    visible.value = true
  }
}

function onBeforeInstallPrompt(e: Event) {
  e.preventDefault()
  installEvent.value = e as BeforeInstallPromptEvent
  canInstall.value = true
  maybeShow()
}

function onAppInstalled() {
  visible.value = false
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(DISMISS_KEY, '1')
  }
}

async function handleInstall() {
  if (!installEvent.value) return
  try {
    await installEvent.value.prompt()
    const choice = await installEvent.value.userChoice
    if (choice.outcome === 'accepted') {
      visible.value = false
    }
  } catch {
    /* prompt cancelado o no soportado */
  }
}

function dismiss() {
  visible.value = false
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(DISMISS_KEY, '1')
  }
}

onMounted(() => {
  if (isStandalone()) return
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.addEventListener('appinstalled', onAppInstalled)
  const timer = setTimeout(maybeShow, 4000)
  onUnmounted(() => {
    clearTimeout(timer)
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.removeEventListener('appinstalled', onAppInstalled)
  })
})
</script>

<template>
  <div
    v-if="visible"
    class="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-[85] w-[calc(100%-2rem)] max-w-sm bg-surface border border-border-strong rounded-lg p-4 shadow-2xl backdrop-blur-sm"
    role="status"
  >
    <div class="flex items-start gap-3">
      <div class="shrink-0 w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
        <svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      </div>
      <div class="flex-1 min-w-0 space-y-1">
        <p class="text-sm font-semibold text-text">Instala la app</p>
        <p v-if="showIos" class="text-xs text-text-muted leading-relaxed">
          Toca el botón <span class="text-text font-medium">Compartir</span> en Safari y elige
          <span class="text-text font-medium">Añadir a pantalla de inicio</span>.
        </p>
        <p v-else-if="showManual" class="text-xs text-text-muted leading-relaxed">
          Instala Internship Tracker para usarla sin conexión y acceder más rápido.
          En <span class="text-text font-medium">{{ isDesktop() ? 'el icono de instalación de la barra de direcciones' : 'el menú del navegador' }}</span>
          elige <span class="text-text font-medium">Instalar aplicación</span>.
        </p>
        <p v-else class="text-xs text-text-muted leading-relaxed">
          Instala Internship Tracker para usarla sin conexión y acceder más rápido.
        </p>
      </div>
    </div>
    <div class="flex items-center justify-end gap-2 mt-3">
      <button
        @click="dismiss"
        class="text-xs font-medium text-text-muted hover:text-text transition-colors px-3 py-1.5 rounded-md"
      >
        Ahora no
      </button>
      <button
        v-if="canInstall"
        @click="handleInstall"
        class="bg-accent hover:bg-accent-hover text-white text-xs font-medium px-4 py-1.5 rounded-md transition-colors"
      >
        Instalar
      </button>
    </div>
  </div>
</template>
