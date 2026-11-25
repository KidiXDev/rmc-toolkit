<script setup lang="ts">
const { boiling = false } = defineProps<{ boiling?: boolean }>()

const COUNT = 64
const CENTER = { x: 624, y: 150 }
const REACH = 900

function drawWedges(salt: number): string[] {
  return Array.from({ length: COUNT }, (_, index) => {
    const jitter = ((index * 37 + salt * 5) % 11) / 11
    const angle = (index / COUNT) * Math.PI * 2 + jitter * 0.06 + salt * 0.03
    const width = 0.008 + jitter * 0.014
    const start = 125 + ((index * 53 + salt * 29) % 70)
    const point = (direction: number, radius: number) =>
      `${CENTER.x + Math.cos(direction) * radius},${CENTER.y + Math.sin(direction) * radius * 0.75}`
    return [point(angle, start), point(angle - width, REACH), point(angle + width, REACH)].join(' ')
  })
}

const frames = [drawWedges(0), drawWedges(1)]
</script>

<template>
  <svg
    viewBox="0 0 800 300"
    preserveAspectRatio="xMidYMid slice"
    class="pointer-events-none absolute left-0 top-0 h-full w-full"
    :class="boiling && 'is-boiling'"
    aria-hidden="true"
  >
    <g v-for="(wedges, frame) in frames" :key="frame" class="focus-frame" :class="`frame-${frame}`">
      <polygon v-for="wedge in wedges" :key="wedge" :points="wedge" fill="var(--rmc-soft)" />
    </g>
  </svg>
</template>
