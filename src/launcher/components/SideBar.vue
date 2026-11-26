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

const recentIds = computed(() => new Set(recent.value.map((game) => game.id)))

const others = computed(() =>
  arrangeGames(library.games, '', 'all', 'title').filter(
    (game) => !game.favorite && !recentIds.value.has(game.id),
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

const isLibraryActive = computed(
  () =>
    navigation.page.name === 'library' ||
    (navigation.page.name === 'game' && !library.gameById(navigation.page.id)),
)

const isActiveGame = (id: string) => navigation.page.name === 'game' && navigation.page.id === id
</script>

<template>
  <nav class="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-chrome px-2.5 pb-2.5 pt-1">
    <div class="grid gap-1.5">
      <SideItem
        class="px-3 py-2 text-sm font-bold"
        :active="navigation.page.name === 'home'"
        @click="navigation.openHome"
      >
        Home
      </SideItem>
      <SideItem
        class="px-3 py-2 text-sm font-bold"
        :active="isLibraryActive"
        @click="navigation.openLibrary"
      >
        <span class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <span>Library</span>
          <span class="font-mono text-xs">{{ library.games.length }}</span>
        </span>
      </SideItem>
      <SideItem
        class="px-3 py-2 text-sm font-bold"
        :active="navigation.page.name === 'activity'"
        @click="navigation.openActivity"
      >
        Activity
      </SideItem>
    </div>

    <div class="side-scroll mt-4 overflow-y-auto pr-0.5">
      <section v-for="group in groups" :key="group.title" class="mb-4">
        <h2 class="px-2.5 pb-1.5 text-xs font-semibold uppercase tracking-wide text-onchrome-dim">
          {{ group.title }}
        </h2>
        <div class="grid gap-1.5">
          <SideItem
            v-for="game in group.games"
            :key="game.id"
            class="px-2 py-1.5"
            :active="isActiveGame(game.id)"
            @click="navigation.openGame(game.id)"
          >
            <span class="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2">
              <span class="h-[21px] w-7 overflow-hidden rounded-[4px]">
                <GameCover :game="game" />
              </span>
              <span class="truncate text-sm" :title="game.title">{{ game.title }}</span>
              <span v-if="game.session !== null" class="playing-dot" title="Playing now" />
            </span>
          </SideItem>
        </div>
      </section>
    </div>

    <div class="mt-2 border-t-hairline border-chrome-hover pt-2">
      <SideItem
        class="px-3 py-2 text-sm font-bold"
        :active="navigation.page.name === 'settings'"
        @click="navigation.openSettings"
      >
        Settings
      </SideItem>
    </div>
  </nav>
</template>
