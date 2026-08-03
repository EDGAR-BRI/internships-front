<script setup lang="ts">
import { ref } from 'vue'
import AttendanceSection from './AttendanceSection.vue'

const isOpen = ref(false)

function open() {
  isOpen.value = true
}

function close() {
  isOpen.value = false
}

defineExpose({ open, close })
</script>

<template>
  <Teleport to="body">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[60] overflow-y-auto bg-black/60 backdrop-blur-sm"
        @click="close"
      >
        <div class="min-h-full flex items-center justify-center p-4 sm:p-6">
          <div
            class="bg-canvas border border-border rounded-lg w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto modal-open"
            @click.stop
          >
            <div class="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <h2 class="text-lg font-semibold text-text">Asistencia</h2>
              <button
                @click="close"
                class="text-text-muted hover:text-text transition-colors p-1.5 rounded-md hover:bg-hover"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="overflow-y-auto p-4 sm:p-6">
              <AttendanceSection />
            </div>
          </div>
        </div>
      </div>
  </Teleport>
</template>

<style scoped>
</style>
