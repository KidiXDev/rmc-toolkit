<script setup lang="ts">
import { computed } from 'vue'

import { useLibrary } from '../library'
import { arrangeGames } from '../librarySort'
import { useNavigation } from '../navigation'
import GameCover from './GameCover.vue'

const library = useLibrary()
const navigation = useNavigation()

const RECENT_LIMIT = 5

const recent = computed(() =>
  arrangeGames(library.games, '', 'all', 'recent')
    .filter((game) => game.lastPlayed !== null && !game.favorite)
    .slice(0, RECENT_LIMIT),
)

const others = computed(() =>
  arrangeGames(library.games, '', 'all', 'title').filter(
    (game) => !game.favorite && !recent.value.includes(game),
  ),
)

const groups = computed(() =>
  [
    { title: 'Favorites', games: arrangeGames(library.favorites, '', 'all', 'title') },
    { title: 'Recently played', games: recent.value },
    { title: 'All other games', games: others.value },
  ].filter((group) => group.games.length > 0),
)

const isActiveGame = (id: string) => navigation.page.name === 'game' && navigation.page.id === id
</script>

<template>
  <nav class="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-ink px-2 pb-2 text-paper">
    <button
      type="button"
      class="side-item rounded-control px-3 py-2 text-left text-[14px] font-bold"
      :class="navigation.page.name === 'library' && 'bg-primary text-ink'"
      @click="navigation.openLibrary"
    >
      Library
      <span class="float-right font-mono text-[12px] opacity-70">{{ library.games.length }}</span>
    </button>

    <div class="side-scroll mt-3 overflow-y-auto">
      <section v-for="group in groups" :key="group.title" class="mb-3">
        <h2 class="px-3 pb-1 text-[11px] font-semibold text-soft">{{ group.title }}</h2>
        <button
          v-for="game in group.games"
          :key="game.id"
          type="button"
          class="side-item grid w-full grid-cols-[28px_minmax(0,1fr)_auto] items-center rounded-control px-2 py-1 text-left gap-2"
          :class="isActiveGame(game.id) && 'bg-primary text-ink'"
          @click="navigation.openGame(game.id)"
        >
          <span class="h-[21px] w-7 overflow-hidden rounded-[4px]">
            <GameCover :game="game" />
          </span>
          <span class="truncate">{{ game.title }}</span>
          <span v-if="game.isRunning" class="h-2 w-2 rounded-full bg-accent" title="Playing now" />
        </button>
      </section>
    </div>

    <button
      type="button"
      class="side-item rounded-control px-3 py-2 text-left text-[14px] font-bold"
      :class="navigation.page.name === 'settings' && 'bg-primary text-ink'"
      @click="navigation.openSettings"
    >
      Settings
    </button>
  </nav>
</template>
