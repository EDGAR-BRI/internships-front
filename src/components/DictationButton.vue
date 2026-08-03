<script setup lang="ts">
import { computed } from 'vue'
import { useSpeechRecognition } from '../composables/useSpeechRecognition'

const props = defineProps<{
  disabled?: boolean
  lang?: string
}>()

const emit = defineEmits<{
  dictated: [text: string]
}>()

const { isSupported, isListening, error, toggleListening } = useSpeechRecognition()

const showError = computed(() => error.value && !isListening.value)

function handleToggle() {
  if (props.disabled || !isSupported) return
  toggleListening({
    onFinal: (text) => emit('dictated', text),
    lang: props.lang || 'es-MX',
  })
}
</script>

<template>
  <button
    type="button"
    @click="handleToggle"
    :disabled="disabled || !isSupported"
    :title="
      !isSupported
        ? 'Tu navegador no soporta dictado por voz'
        : isListening
          ? 'Detener dictado'
          : showError
            ? error
            : 'Dictar por voz'
    "
    class="inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors flex-shrink-0"
    :class="
      disabled || !isSupported
        ? 'text-text-disabled cursor-not-allowed'
        : isListening
          ? 'text-error bg-error/10 animate-pulse'
          : 'text-text-muted hover:text-text hover:bg-overlay'
    "
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8m-4-18a3 3 0 00-3 3v5a3 3 0 006 0V5a3 3 0 00-3-3z"
      />
    </svg>
  </button>
</template>
