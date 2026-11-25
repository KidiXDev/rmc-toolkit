<script setup lang="ts">
import { computed, ref } from 'vue'

import { dailyTotals } from '../activityStats'
import type { PlaySession } from '../api'
import { formatDuration } from '../format'
import { useNow } from '../useNow'

const { sessions, days } = defineProps<{ sessions: PlaySession[]; days: number }>()

const REFRESH_MS = 60_000
const MIN_SCALE_MS = 1_800_000
const ALL_LABELS_UP_TO = 14
const LABEL_STEP = 5

const now = useNow(REFRESH_MS)
const hovered = ref<number | null>(null)

const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const dayMonth = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })
const fullDay = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const totals = computed(() => dailyTotals(sessions, days, now.value))
const peak = computed(() => Math.max(MIN_SCALE_MS, ...totals.value.map((day) => day.playedMs)))

const bars = computed(() =>
  totals.value.map((day, index) => {
    const isLabeled =
      days <= ALL_LABELS_UP_TO || (totals.value.length - 1 - index) % LABEL_STEP === 0
    const format = days <= 7 ? weekday : dayMonth
    return {
      key: day.start,
      height: `${(day.playedMs / peak.value) * 100}%`,
      label: isLabeled ? format.format(day.start) : '',
      date: fullDay.format(day.start),
      hasPlay: day.playedMs > 0,
      played: day.playedMs > 0 ? formatDuration(day.playedMs) : 'Not played',
      isPeak: day.playedMs > 0 && day.playedMs === peak.value,
    }
  }),
)

const tip = computed(() => (hovered.value === null ? undefined : bars.value[hovered.value]))
const tipSide = computed(() => ((hovered.value ?? 0) < bars.value.length / 2 ? 'left' : 'right'))
const tipOffset = computed(() => {
  const index = hovered.value ?? 0
  const slot = 100 / bars.value.length
  return tipSide.value === 'left'
    ? `${index * slot}%`
    : `${(bars.value.length - 1 - index) * slot}%`
})
</script>

<template>
  <figure class="relative m-0 pt-6" @mouseleave="hovered = null">
    <div
      class="grid h-[128px] items-end border-b-outline border-ink"
      :style="{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }"
    >
      <button
        v-for="(bar, index) in bars"
        :key="bar.key"
        type="button"
        class="relative flex h-full cursor-default items-end justify-center"
        :aria-label="`${bar.date}: ${bar.played}`"
        @mouseenter="hovered = index"
        @focus="hovered = index"
        @blur="hovered = null"
      >
        <span
          v-if="bar.hasPlay"
          class="day-bar smooth relative block w-[calc(100%-4px)] max-w-[34px] rounded-t-[4px] border-outline border-b-0 border-ink"
          :class="hovered === index ? 'bg-accent' : 'bg-primary'"
          :style="{ height: bar.height, '--order': index }"
        >
          <span
            v-if="bar.isPeak && hovered === null"
            class="absolute bottom-full left-1/2 -translate-x-1/2 whitespace-nowrap pb-0.5 text-[11px] text-dim"
          >
            {{ bar.played }}
          </span>
        </span>
      </button>
    </div>
    <div
      class="grid pt-1 text-center text-[11px] text-dim"
      :style="{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }"
      aria-hidden="true"
    >
      <span v-for="bar in bars" :key="bar.key" class="whitespace-nowrap">{{ bar.label }}</span>
    </div>
    <div
      v-if="tip"
      class="pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-control border-outline border-ink bg-paper px-2 py-0.5 text-[12px] shadow-control"
      :style="{ [tipSide]: tipOffset }"
    >
      <b>{{ tip.played }}</b>
      <span class="ml-1.5 text-dim">{{ tip.date }}</span>
    </div>
  </figure>
</template>
