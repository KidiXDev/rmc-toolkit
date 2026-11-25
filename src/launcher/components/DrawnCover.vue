<script setup lang="ts">
import { computed, useId } from 'vue'

const { title } = defineProps<{ title: string }>()

const FILLS = ['var(--rmc-primary)', 'var(--rmc-accent)', 'var(--rmc-soft)', 'var(--rmc-track)']
const SPIKES = 22

const dotsId = useId()

const seed = computed(() =>
  [...title].reduce((hash, letter) => (hash * 31 + (letter.codePointAt(0) ?? 0)) % 9973, 7),
)

const initials = computed(() => {
  const words = title.split(/[\s\-_:]+/).filter(Boolean)
  const letters = words.map((word) => [...word][0] ?? '')
  return letters.slice(0, 2).join('').toUpperCase() || '?'
})

const fill = computed(() => FILLS[seed.value % FILLS.length])

const star = computed(() =>
  Array.from({ length: SPIKES * 2 }, (_, index) => {
    const wobble = ((seed.value * (index + 3)) % 17) / 17
    const radius = index % 2 === 0 ? 92 + wobble * 34 : 56 + wobble * 12
    const angle = (index / (SPIKES * 2)) * Math.PI * 2
    return `${160 + Math.cos(angle) * radius},${120 + Math.sin(angle) * radius}`
  }).join(' '),
)
</script>

<template>
  <svg
    viewBox="0 0 320 240"
    preserveAspectRatio="xMidYMid slice"
    class="h-full w-full"
    aria-hidden="true"
  >
    <defs>
      <pattern :id="dotsId" width="10" height="10" patternUnits="userSpaceOnUse">
        <circle cx="2.5" cy="2.5" r="1.7" fill="var(--rmc-ink)" opacity="0.28" />
        <circle cx="7.5" cy="7.5" r="1.7" fill="var(--rmc-ink)" opacity="0.28" />
      </pattern>
    </defs>
    <rect width="320" height="240" :fill="fill" />
    <rect width="320" height="240" :fill="`url(#${dotsId})`" />
    <polygon
      :points="star"
      fill="var(--rmc-paper)"
      stroke="var(--rmc-ink)"
      stroke-width="4"
      stroke-linejoin="round"
    />
    <text
      x="160"
      y="122"
      text-anchor="middle"
      dominant-baseline="central"
      fill="var(--rmc-ink)"
      font-family="var(--rmc-font-display)"
      font-style="italic"
      font-weight="800"
      font-size="58"
    >
      {{ initials }}
    </text>
  </svg>
</template>
