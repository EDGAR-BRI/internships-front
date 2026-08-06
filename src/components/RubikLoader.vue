<script setup lang="ts">
withDefaults(defineProps<{ label?: string; size?: number }>(), { label: '', size: 84 })

const S = 28
const POS = [-S, 0, S]

const DARK = '#1c1c1e'

const FACES = [
  {
    key: 'front',
    transform: `translateZ(${S / 2}px)`,
    color: (_x: number, _y: number, z: number) => (z === 2 ? '#2ea043' : DARK),
  },
  {
    key: 'back',
    transform: `rotateY(180deg) translateZ(${S / 2}px)`,
    color: (_x: number, _y: number, z: number) => (z === 0 ? '#1f6feb' : DARK),
  },
  {
    key: 'right',
    transform: `rotateY(90deg) translateZ(${S / 2}px)`,
    color: (x: number) => (x === 2 ? '#da3633' : DARK),
  },
  {
    key: 'left',
    transform: `rotateY(-90deg) translateZ(${S / 2}px)`,
    color: (x: number) => (x === 0 ? '#f0883e' : DARK),
  },
  {
    key: 'top',
    transform: `rotateX(90deg) translateZ(${S / 2}px)`,
    color: (_x: number, y: number) => (y === 0 ? '#ffffff' : DARK),
  },
  {
    key: 'bottom',
    transform: `rotateX(-90deg) translateZ(${S / 2}px)`,
    color: (_x: number, y: number) => (y === 2 ? '#f5a623' : DARK),
  },
] as const

const ROWS = [0, 1, 2]

function miniStyle(x: number, y: number, z: number) {
  return {
    transform: `translate3d(${POS[x]}px, ${POS[y]}px, ${POS[z]}px)`,
  }
}

function faceStyle(x: number, y: number, z: number, transform: string, color: string) {
  return { transform, background: color }
}

function faceColor(x: number, y: number, z: number, faceIndex: number): string {
  const f = FACES[faceIndex]
  return f.color(x, y, z)
}
</script>

<template>
  <div class="flex flex-col items-center gap-4" :style="{ '--cube-size': size + 'px' }">
    <div class="cube-wrap">
      <div class="cube">
        <div v-for="y in ROWS" :key="y" class="row" :class="`row-${y + 1}`">
          <div v-for="x in ROWS" :key="`x${x}z0`" class="mini" :style="miniStyle(x, y, 0)">
            <span
              v-for="(f, i) in FACES"
              :key="f.key"
              class="face"
              :style="faceStyle(x, y, 0, f.transform, faceColor(x, y, 0, i))"
            ></span>
          </div>
          <div v-for="x in ROWS" :key="`x${x}z1`" class="mini" :style="miniStyle(x, y, 1)">
            <span
              v-for="(f, i) in FACES"
              :key="f.key"
              class="face"
              :style="faceStyle(x, y, 1, f.transform, faceColor(x, y, 1, i))"
            ></span>
          </div>
          <div v-for="x in ROWS" :key="`x${x}z2`" class="mini" :style="miniStyle(x, y, 2)">
            <span
              v-for="(f, i) in FACES"
              :key="f.key"
              class="face"
              :style="faceStyle(x, y, 2, f.transform, faceColor(x, y, 2, i))"
            ></span>
          </div>
        </div>
      </div>
    </div>
    <p v-if="label" class="text-sm text-text-secondary">{{ label }}</p>
  </div>
</template>

<style scoped>
.cube-wrap {
  width: var(--cube-size);
  height: var(--cube-size);
  perspective: 600px;
}

.cube {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  animation: rubik-spin 7s linear infinite;
}

@keyframes rubik-spin {
  0% {
    transform: rotateX(-35deg) rotateY(0deg);
  }
  25% {
    transform: rotateX(-15deg) rotateY(90deg);
  }
  50% {
    transform: rotateX(-35deg) rotateY(180deg);
  }
  75% {
    transform: rotateX(-15deg) rotateY(270deg);
  }
  100% {
    transform: rotateX(-35deg) rotateY(360deg);
  }
}

.row {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform-origin: 50% 50% 50%;
}

.row-1 {
  animation: layer-spin-y 7s ease-in-out 0s infinite;
}
.row-2 {
  animation: layer-spin-x 7s ease-in-out 2.33s infinite;
}
.row-3 {
  animation: layer-spin-z 7s ease-in-out 4.66s infinite;
}

@keyframes layer-spin-y {
  0% {
    transform: rotateY(0deg);
  }
  33% {
    transform: rotateY(360deg);
  }
  100% {
    transform: rotateY(360deg);
  }
}

@keyframes layer-spin-x {
  0% {
    transform: rotateX(0deg);
  }
  33% {
    transform: rotateX(360deg);
  }
  100% {
    transform: rotateX(360deg);
  }
}

@keyframes layer-spin-z {
  0% {
    transform: rotateZ(0deg);
  }
  33% {
    transform: rotateZ(360deg);
  }
  100% {
    transform: rotateZ(360deg);
  }
}

.mini {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 28px;
  height: 28px;
  margin: -14px 0 0 -14px;
  transform-style: preserve-3d;
}

.face {
  position: absolute;
  inset: 0;
  border-radius: 3px;
  box-shadow:
    inset 0 1px 2px rgba(255, 255, 255, 0.3),
    inset 0 -1px 2px rgba(0, 0, 0, 0.45);
}
</style>
