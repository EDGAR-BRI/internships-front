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

export function useSpeechRecognition() {
  const isSupported = getRecognitionCtor() !== null
  const isListening = ref(false)
  const error = ref('')

  let recognition: SpeechRecognitionLike | null = null

  function startListening(options: DictateOptions) {
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      error.value = 'Tu navegador no soporta dictado por voz.'
      return
    }

    const lang = options.lang || 'es-MX'

    if (!recognition) {
      recognition = new Ctor()
    }

    const rec = recognition
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (event) => {
      error.value = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          const text = result[0]?.transcript?.trim()
          if (text && options.onFinal) options.onFinal(text)
        }
      }
    }

    rec.onerror = (event) => {
      error.value = ERROR_MESSAGES[event.error] ?? 'Error al transcribir. Intenta de nuevo.'
      if (event.error === 'not-allowed' || event.error === 'audio-capture' || event.error === 'service-not-allowed') {
        isListening.value = false
      }
    }

    rec.onend = () => {
      if (isListening.value) {
        try {
          rec.start()
        } catch {}
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
    if (recognition) {
      try {
        recognition.stop()
      } catch {}
    }
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
