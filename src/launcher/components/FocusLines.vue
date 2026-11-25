<script setup lang="ts">
const COUNT = 64
const CENTER = { x: 624, y: 150 }
const REACH = 900

const wedges = Array.from({ length: COUNT }, (_, index) => {
  const jitter = ((index * 37) % 11) / 11
  const angle = (index / COUNT) * Math.PI * 2 + jitter * 0.06
  const width = 0.008 + jitter * 0.014
  const start = 125 + ((index * 53) % 70)
  const point = (direction: number, radius: number) =>
    `${CENTER.x + Math.cos(direction) * radius},${CENTER.y + Math.sin(direction) * radius * 0.75}`
  return [point(angle, start), point(angle - width, REACH), point(angle + width, REACH)].join(' ')
})
</script>

<template>
  <svg
    viewBox="0 0 800 300"
    preserveAspectRatio="xMidYMid slice"
    class="pointer-events-none absolute left-0 top-0 h-full w-full"
    aria-hidden="true"
  >
    <polygon v-for="wedge in wedges" :key="wedge" :points="wedge" fill="var(--rmc-soft)" />
  </svg>
</template>
