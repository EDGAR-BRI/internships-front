<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'

export interface TourStep {
  target: string
  title: string
  text: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

const props = withDefaults(
  defineProps<{
    steps: TourStep[]
    storageKey: string
    enabled?: boolean
  }>(),
  { enabled: true }
)

const emit = defineEmits<{ finish: [] }>()

const active = ref(0)
const open = ref(false)
const highlightRect = ref<DOMRect | null>(null)
const tipStyle = ref({ top: 0, left: 0 })
const tipPlacement = ref<'top' | 'bottom' | 'left' | 'right'>('bottom')
const tipEl = ref<HTMLElement | null>(null)

const current = computed(() => props.steps[active.value])
const isLast = computed(() => active.value >= props.steps.length - 1)
const progress = computed(() => ((active.value + 1) / props.steps.length) * 100)

function positionFor(index: number) {
  const step = props.steps[index]
  if (!step) return
  const el = document.querySelector(step.target)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })

  setTimeout(() => {
    const rect = el.getBoundingClientRect()
    highlightRect.value = rect
    const placement = step.placement || 'bottom'
    tipPlacement.value = placement

    nextTick(() => {
      const tip = tipEl.value
      if (!tip) return
      const tw = tip.offsetWidth
      const th = tip.offsetHeight
      const margin = 14

      let top = 0
      let left = 0
      if (placement === 'bottom') {
        top = rect.bottom + margin
        left = rect.left + rect.width / 2 - tw / 2
      } else if (placement === 'top') {
        top = rect.top - th - margin
        left = rect.left + rect.width / 2 - tw / 2
      } else if (placement === 'left') {
        top = rect.top + rect.height / 2 - th / 2
        left = rect.left - tw - margin
      } else {
        top = rect.top + rect.height / 2 - th / 2
        left = rect.right + margin
      }

      top = Math.max(12, Math.min(top, window.innerHeight - th - 12))
      left = Math.max(12, Math.min(left, window.innerWidth - tw - 12))
      tipStyle.value = { top, left }
    })
  }, 350)
}

function next() {
  if (isLast.value) {
    finish()
    return
  }
  active.value++
  positionFor(active.value)
}

function prev() {
  if (active.value === 0) return
  active.value--
  positionFor(active.value)
}

function finish() {
  open.value = false
  highlightRect.value = null
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(props.storageKey, '1')
  }
  emit('finish')
}

function skip() {
  finish()
}

function onResize() {
  if (open.value) positionFor(active.value)
}

onMounted(() => {
  if (!props.enabled) return
  if (typeof localStorage === 'undefined') return
  if (localStorage.getItem(props.storageKey)) return

  const timer = setTimeout(() => {
    open.value = true
    positionFor(active.value)
  }, 900)
  window.addEventListener('resize', onResize)
  window.addEventListener('scroll', onResize, { passive: true })

  onUnmounted(() => {
    clearTimeout(timer)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('scroll', onResize)
  })
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[90]" role="dialog" aria-modal="true">
      <!-- Overlay oscuro con hueco en el elemento resaltado -->
      <svg class="fixed inset-0 w-full h-full" width="100%" height="100%">
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              v-if="highlightRect"
              :x="highlightRect.left - 4"
              :y="highlightRect.top - 4"
              :width="highlightRect.width + 8"
              :height="highlightRect.height + 8"
              rx="10"
              fill="black"
            />
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="black" fill-opacity="0.6" mask="url(#tour-mask)" />
        <rect
          v-if="highlightRect"
          :x="highlightRect.left - 4"
          :y="highlightRect.top - 4"
          :width="highlightRect.width + 8"
          :height="highlightRect.height + 8"
          rx="10"
          fill="none"
          stroke="var(--color-accent)"
          stroke-width="2"
        />
      </svg>

      <!-- Tooltip -->
      <div
        ref="tipEl"
        class="fixed z-[91] w-72 max-w-[calc(100vw-2rem)] bg-surface border border-border-strong rounded-xl shadow-2xl p-4 space-y-3"
        :style="{ top: tipStyle.top + 'px', left: tipStyle.left + 'px' }"
      >
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-accent">
            Paso {{ active + 1 }} de {{ steps.length }}
          </span>
          <button
            @click="skip"
            class="text-text-muted hover:text-text transition-colors p-1 rounded"
            aria-label="Saltar"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="h-0.5 bg-overlay rounded-full overflow-hidden">
          <div class="h-full bg-accent transition-all" :style="{ width: progress + '%' }"></div>
        </div>

        <h3 class="text-sm font-semibold text-text">{{ current.title }}</h3>
        <p class="text-xs text-text-muted leading-relaxed">{{ current.text }}</p>

        <div class="flex items-center justify-between pt-1">
          <button
            v-if="active > 0"
            @click="prev"
            class="text-xs font-medium text-text-muted hover:text-text transition-colors px-2 py-1.5 rounded-md"
          >
            Atrás
          </button>
          <span v-else></span>
          <button
            @click="next"
            class="bg-accent hover:bg-accent-hover text-white text-xs font-medium px-4 py-1.5 rounded-md transition-colors"
          >
            {{ isLast ? 'Empezar' : 'Siguiente' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
