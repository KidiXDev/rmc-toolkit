<script setup lang="ts">
import { computed } from 'vue'

import UiSection from '@/ui/UiSection.vue'

import { summarize } from '../activityStats'
import type { GameInfo } from '../api'
import DayChart from '../components/DayChart.vue'
import SessionList from '../components/SessionList.vue'
import StatRow from '../components/StatRow.vue'
import { formatDuration } from '../format'
import { useLibrary } from '../library'

const { game } = defineProps<{ game: GameInfo }>()

const DAYS = 14

const library = useLibrary()

const sessions = computed(() => library.sessions.filter((session) => session.game === game.id))
const summary = computed(() => summarize(sessions.value, DAYS, library.fetchedAt))

const stats = computed(() => [
  { label: 'In total', value: formatDuration(game.playMs) },
  { label: 'Last 14 days', value: formatDuration(summary.value.playedMs) },
  { label: 'Sessions', value: String(sessions.value.length) },
  {
    label: 'Longest session',
    value: formatDuration(Math.max(0, ...sessions.value.map((session) => session.playedMs))),
  },
])
</script>

<template>
  <StatRow :stats="stats" />
  <DayChart class="mb-5 mt-2" :sessions="sessions" :days="DAYS" />
  <UiSection title="Sessions">
    <SessionList :sessions="sessions" />
  </UiSection>
</template>
