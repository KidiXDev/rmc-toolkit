<script setup lang="ts">
import { computed, ref } from 'vue'

import UiButton from '@/ui/UiButton.vue'
import UiSection from '@/ui/UiSection.vue'

import { playedByGame, sessionsWithin, summarize } from '../activityStats'
import DayChart from '../components/DayChart.vue'
import GameCover from '../components/GameCover.vue'
import SessionList from '../components/SessionList.vue'
import StatRow from '../components/StatRow.vue'
import { formatDuration } from '../format'
import { useLibrary } from '../library'
import { useNavigation } from '../navigation'

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
]
const TOP_LIMIT = 6

const library = useLibrary()
const navigation = useNavigation()
const days = ref(7)

const summary = computed(() => summarize(library.sessions, days.value, library.fetchedAt))

const stats = computed(() => [
  { label: 'Played', value: formatDuration(summary.value.playedMs) },
  { label: 'Sessions', value: String(summary.value.sessions) },
  { label: 'Longest session', value: formatDuration(summary.value.longestMs) },
  { label: 'Days with play', value: String(summary.value.activeDays) },
])

const top = computed(() => {
  const ranked = playedByGame(library.sessions, days.value, library.fetchedAt).slice(0, TOP_LIMIT)
  const peak = ranked[0]?.playedMs ?? 1
  return ranked.flatMap(({ game: id, playedMs }) => {
    const game = library.gameById(id)
    return game ? [{ game, playedMs, width: `${(playedMs / peak) * 100}%` }] : []
  })
})

const recent = computed(() => sessionsWithin(library.sessions, days.value, library.fetchedAt))
</script>

<template>
  <div class="h-full overflow-y-auto px-5 py-4">
    <div class="max-w-[820px]">
      <div class="mb-3 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1.5">
        <h1 class="font-display text-[26px] font-extrabold italic leading-none">Activity</h1>
        <UiButton
          v-for="range in RANGES"
          :key="range.days"
          :active="range.days === days"
          @click="days = range.days"
        >
          {{ range.label }}
        </UiButton>
      </div>

      <StatRow :stats="stats" />
      <DayChart :key="days" class="mb-5 mt-2" :sessions="library.sessions" :days="days" />

      <UiSection v-if="top.length > 0" title="Most played">
        <button
          v-for="entry in top"
          :key="entry.game.id"
          type="button"
          class="grid w-full grid-cols-[40px_minmax(0,180px)_minmax(0,1fr)_80px] items-center py-1.5 text-left gap-3 hover:bg-panel"
          @click="navigation.openGame(entry.game.id)"
        >
          <span class="h-[30px] w-10 overflow-hidden rounded-[5px] border-hairline border-ink">
            <GameCover :game="entry.game" />
          </span>
          <span class="truncate font-bold">{{ entry.game.title }}</span>
          <span class="block h-3">
            <span
              class="share-bar block h-full rounded-r-[4px] border-outline border-ink bg-primary"
              :style="{ width: entry.width }"
            />
          </span>
          <span class="text-right font-mono text-[12px]">{{ formatDuration(entry.playedMs) }}</span>
        </button>
      </UiSection>

      <UiSection title="Sessions">
        <SessionList :sessions="recent" show-game />
      </UiSection>
    </div>
  </div>
</template>
