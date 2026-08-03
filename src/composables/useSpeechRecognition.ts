import { ref } from 'vue'

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: ((event: any) => void) | null
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

interface DictateOptions {
  onFinal: (text: string) => void
  lang?: string
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Permiso de micrófono denegado. Habilítalo para usar el dictado.',
  'service-not-allowed': 'No se permitió usar el servicio de voz.',
  'audio-capture': 'No se encontró un micrófono disponible.',
  network: 'Error de red al transcribir. Intenta de nuevo.',
}

function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/^[¿¡("']+/, '')
    .replace(/[.,;:!?()"'\u2026]+$/, '')
    .replace(/\s+/g, ' ')
}

export function appendDictatedText(current: string, text: string): string {
  const normText = normalizeText(text)
  if (!normText) return current
  const trimmed = current.trimEnd()
  if (!trimmed) return text.trim()

  const normCurrent = normalizeText(trimmed)
  if (normCurrent.endsWith(normText)) return current
  if (normText.startsWith(normCurrent)) return text.trim()

  return `${trimmed} ${text.trim()}`
}

export function useSpeechRecognition() {
  const isSupported = getRecognitionCtor() !== null
  const isListening = ref(false)
  const error = ref('')

  let recognition: SpeechRecognitionLike | null = null
  let sessionId = 0
  let lastResultIndex = 0
  let lastFinalNorm = ''

  function startListening(options: DictateOptions) {
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      error.value = 'Tu navegador no soporta dictado por voz.'
      return
    }

    const lang = options.lang || 'es-MX'
    const rec = new Ctor()
    const session = ++sessionId
    recognition = rec

    lastResultIndex = 0
    lastFinalNorm = ''

    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (event) => {
      error.value = ''
      const results = event.results
      if (results.length < lastResultIndex) {
        lastResultIndex = 0
      }
      for (let i = Math.max(event.resultIndex, lastResultIndex); i < results.length; i++) {
        const result = results[i]
        if (result.isFinal) {
          const text = result[0]?.transcript?.trim()
          if (!text) continue

          const norm = normalizeText(text)
          if (norm === lastFinalNorm) continue
          lastFinalNorm = norm

          if (options.onFinal) options.onFinal(text)
        }
      }
      lastResultIndex = results.length
    }

    rec.onerror = (event) => {
      error.value = ERROR_MESSAGES[event.error] ?? 'Error al transcribir. Intenta de nuevo.'
      if (
        event.error === 'not-allowed' ||
        event.error === 'audio-capture' ||
        event.error === 'service-not-allowed'
      ) {
        isListening.value = false
      }
    }

    rec.onend = () => {
      if (isListening.value && session === sessionId) {
        startListening(options)
      }
    }

    try {
      rec.start()
      isListening.value = true
    } catch {
      isListening.value = false
    }
  }

  function stopListening() {
    sessionId++
    if (recognition) {
      try {
        recognition.stop()
      } catch {}
    }
    recognition = null
    isListening.value = false
  }

  function toggleListening(options: DictateOptions) {
    if (isListening.value) {
      stopListening()
    } else {
      startListening(options)
    }
  }

  return {
    isSupported,
    isListening,
    error,
    startListening,
    stopListening,
    toggleListening,
  }
}
