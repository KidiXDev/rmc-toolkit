<script setup lang="ts">
import { computed } from 'vue'

import UiButton from '@/ui/UiButton.vue'

import { dailyTotals } from '../activityStats'
import DayChart from '../components/DayChart.vue'
import EmptyShelf from '../components/EmptyShelf.vue'
import FocusLines from '../components/FocusLines.vue'
import GameCard from '../components/GameCard.vue'
import GameCover from '../components/GameCover.vue'
import PlayButton from '../components/PlayButton.vue'
import { formatDuration, playSummary } from '../format'
import { useLibrary } from '../library'
import { arrangeGames } from '../librarySort'
import { useNavigation } from '../navigation'

const RECENT_LIMIT = 4
const WEEK = 7

const library = useLibrary()
const navigation = useNavigation()

const byRecent = computed(() => arrangeGames(library.games, '', 'all', 'recent'))
const featured = computed(() => byRecent.value[0])

const playing = computed(() =>
  byRecent.value
    .filter((game) => game.playStatus === 'playing' && game.id !== featured.value?.id)
    .slice(0, RECENT_LIMIT),
)

const playingIds = computed(() => new Set(playing.value.map((game) => game.id)))

const recent = computed(() =>
  byRecent.value
    .slice(1)
    .filter((game) => game.lastPlayed !== null && !playingIds.value.has(game.id))
    .slice(0, RECENT_LIMIT),
)

const planned = computed(() =>
  arrangeGames(library.games, '', 'all', 'title')
    .filter((game) => game.playStatus === 'planned' && game.id !== featured.value?.id)
    .slice(0, RECENT_LIMIT),
)

const shelves = computed(() =>
  [
    { title: 'Currently playing', games: playing.value },
    { title: 'Jump back in', games: recent.value },
    { title: 'Planned', games: planned.value },
  ].filter((shelf) => shelf.games.length > 0),
)

const weekTotal = computed(() =>
  dailyTotals(library.sessions, WEEK, library.fetchedAt).reduce(
    (sum, day) => sum + day.playedMs,
    0,
  ),
)
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div v-if="library.isLoaded && !featured" class="h-full p-5"><EmptyShelf /></div>
    <template v-else-if="featured">
      <section
        class="relative grid h-[250px] cursor-pointer grid-cols-[56%_minmax(0,1fr)] grid-rows-1 overflow-hidden border-b-outline border-ink bg-paper"
        @click="navigation.openGame(featured.id)"
      >
        <FocusLines :boiling="featured.session !== null" />
        <div class="cover-panel relative h-full bg-ink pr-[5px]">
          <div class="cover-panel h-full"><GameCover :game="featured" /></div>
        </div>
        <div class="relative grid content-center justify-items-center px-4 text-center gap-2">
          <p class="bg-paper px-2 text-dim">
            {{ featured.lastPlayed === null ? 'Ready to play' : 'Continue playing' }}
          </p>
          <h1
            class="line-clamp-2 max-w-full break-words bg-paper px-2 pb-0.5 font-display text-[26px] font-extrabold italic leading-[1.1]"
            :title="featured.title"
          >
            {{ featured.title }}
          </h1>
          <PlayButton class="my-1" :game="featured" size="large" />
          <p class="bg-paper px-2 text-[12px] text-dim">{{ playSummary(featured) }}</p>
        </div>
      </section>

      <div class="grid px-5 py-4 gap-5">
        <section>
          <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center">
            <h2 class="font-display text-[18px] font-extrabold italic">
              This week
              <span class="font-body text-[13px] font-medium not-italic text-dim">
                {{ weekTotal > 0 ? formatDuration(weekTotal) : 'Nothing played yet' }}
              </span>
            </h2>
            <UiButton @click="navigation.openActivity">All activity</UiButton>
          </div>
          <DayChart :sessions="library.sessions" :days="WEEK" />
        </section>

        <section v-for="shelf in shelves" :key="shelf.title">
          <h2 class="mb-2 font-display text-[18px] font-extrabold italic">{{ shelf.title }}</h2>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(188px,1fr))] gap-4">
            <GameCard v-for="game in shelf.games" :key="game.id" :game="game" />
          </div>
        </section>
      </div>
    </template>
  </div>
</template>
