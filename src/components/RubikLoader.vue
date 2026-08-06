<script setup lang="ts">
defineProps<{ label?: string }>()
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <div class="cube-wrap">
      <div class="cube">
        <div class="face front">
          <span v-for="(c, i) in ['green', 'red', 'yellow', 'white', 'green', 'orange', 'red', 'blue', 'white']" :key="i" :style="{ background: c }"></span>
        </div>
        <div class="face back">
          <span v-for="(c, i) in ['red', 'white', 'blue', 'yellow', 'blue', 'green', 'white', 'orange', 'red']" :key="i" :style="{ background: c }"></span>
        </div>
        <div class="face left">
          <span v-for="(c, i) in ['orange', 'green', 'white', 'red', 'orange', 'blue', 'yellow', 'white', 'orange']" :key="i" :style="{ background: c }"></span>
        </div>
        <div class="face right">
          <span v-for="(c, i) in ['blue', 'yellow', 'red', 'green', 'red', 'white', 'blue', 'green', 'yellow']" :key="i" :style="{ background: c }"></span>
        </div>
        <div class="face top">
          <span v-for="(c, i) in ['white', 'orange', 'yellow', 'blue', 'white', 'green', 'orange', 'yellow', 'red']" :key="i" :style="{ background: c }"></span>
        </div>
        <div class="face bottom">
          <span v-for="(c, i) in ['yellow', 'blue', 'orange', 'green', 'yellow', 'red', 'blue', 'green', 'orange']" :key="i" :style="{ background: c }"></span>
        </div>
      </div>
    </div>
    <p v-if="label" class="text-sm text-text-secondary">{{ label }}</p>
  </div>
</template>

<style scoped>
.cube-wrap {
  width: 84px;
  height: 84px;
  perspective: 600px;
}

.cube {
  width: 84px;
  height: 84px;
  position: relative;
  transform-style: preserve-3d;
  animation: spin 5s linear infinite;
}

@keyframes spin {
  from {
    transform: rotateX(-25deg) rotateY(0deg);
  }
  to {
    transform: rotateX(-25deg) rotateY(360deg);
  }
}

.face {
  position: absolute;
  width: 84px;
  height: 84px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 3px;
  padding: 5px;
  background: #1a1a1a;
  border-radius: 6px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.face span {
  border-radius: 2px;
  box-shadow:
    inset 0 1px 2px rgba(255, 255, 255, 0.35),
    inset 0 -1px 2px rgba(0, 0, 0, 0.35);
}

.face.front {
  transform: translateZ(42px);
}
.face.back {
  transform: rotateY(180deg) translateZ(42px);
}
.face.left {
  transform: rotateY(-90deg) translateZ(42px);
}
.face.right {
  transform: rotateY(90deg) translateZ(42px);
}
.face.top {
  transform: rotateX(90deg) translateZ(42px);
}
.face.bottom {
  transform: rotateX(-90deg) translateZ(42px);
}
</style>
