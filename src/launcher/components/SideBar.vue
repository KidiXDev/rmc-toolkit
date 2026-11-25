<script setup lang="ts">
import { computed } from 'vue'

import { useLibrary } from '../library'
import { arrangeGames } from '../librarySort'
import { useNavigation } from '../navigation'
import GameCover from './GameCover.vue'
import SideItem from './SideItem.vue'

const RECENT_LIMIT = 5

const library = useLibrary()
const navigation = useNavigation()

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

const othersTitle = computed(() =>
  others.value.length === library.games.length ? 'All games' : 'All other games',
)

const groups = computed(() =>
  [
    { title: 'Favorites', games: arrangeGames(library.favorites, '', 'all', 'title') },
    { title: 'Recently played', games: recent.value },
    { title: othersTitle.value, games: others.value },
  ].filter((group) => group.games.length > 0),
)

const isActiveGame = (id: string) => navigation.page.name === 'game' && navigation.page.id === id
</script>

<template>
  <nav class="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-chrome px-2 pb-2">
    <div class="grid gap-0.5">
      <SideItem
        class="px-3 py-1.5 text-[14px] font-bold"
        :active="navigation.page.name === 'home'"
        @click="navigation.openHome"
      >
        Home
      </SideItem>
      <SideItem
        class="px-3 py-1.5 text-[14px] font-bold"
        :active="navigation.page.name === 'library'"
        @click="navigation.openLibrary"
      >
        Library
        <span class="float-right font-mono text-[12px]">{{ library.games.length }}</span>
      </SideItem>
      <SideItem
        class="px-3 py-1.5 text-[14px] font-bold"
        :active="navigation.page.name === 'activity'"
        @click="navigation.openActivity"
      >
        Activity
      </SideItem>
    </div>

    <div class="side-scroll mt-3 overflow-y-auto">
      <section v-for="group in groups" :key="group.title" class="mb-3">
        <h2 class="px-3 pb-1 text-[11px] font-semibold text-onchrome-dim">{{ group.title }}</h2>
        <SideItem
          v-for="game in group.games"
          :key="game.id"
          class="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center px-2 py-1 gap-2"
          :active="isActiveGame(game.id)"
          @click="navigation.openGame(game.id)"
        >
          <span class="h-[21px] w-7 overflow-hidden rounded-[4px]">
            <GameCover :game="game" />
          </span>
          <span class="truncate" :title="game.title">{{ game.title }}</span>
          <span v-if="game.session !== null" class="playing-dot" title="Playing now" />
        </SideItem>
      </section>
    </div>

    <SideItem
      class="px-3 py-2 text-[14px] font-bold"
      :active="navigation.page.name === 'settings'"
      @click="navigation.openSettings"
    >
      Settings
    </SideItem>
  </nav>
</template>
