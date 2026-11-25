<script setup lang="ts">
import { computed } from 'vue'

import UiButton from '@/ui/UiButton.vue'
import UiSelect from '@/ui/UiSelect.vue'

import EmptyShelf from '../components/EmptyShelf.vue'
import GameCard from '../components/GameCard.vue'
import GameRow from '../components/GameRow.vue'
import { useLibrary } from '../library'
import {
  arrangeGames,
  FILTER_LABELS,
  FILTERS,
  PLAY_STATUS_LABELS,
  PLAY_STATUSES,
  SORT_LABELS,
  SORTS,
  type StatusFilter,
} from '../librarySort'
import { useNavigation } from '../navigation'
import { usePreferences } from '../preferences'

const library = useLibrary()
const navigation = useNavigation()
const preferences = usePreferences()

const sortOptions = SORTS.map((value) => ({ value, label: SORT_LABELS[value] }))

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'any', label: 'Any status' },
  ...PLAY_STATUSES.map((value) => ({ value, label: PLAY_STATUS_LABELS[value] })),
]

const visible = computed(() =>
  arrangeGames(
    library.games,
    navigation.query,
    preferences.filter,
    preferences.sort,
    preferences.statusFilter,
  ),
)

function showEverything() {
  navigation.query = ''
  preferences.filter = 'all'
  preferences.statusFilter = 'any'
}
</script>

<template>
  <div class="grid h-full grid-rows-[auto_minmax(0,1fr)]">
    <div class="grid px-5 pb-3 pt-4 gap-2">
      <div class="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1.5">
        <h1 class="font-display text-[26px] font-extrabold italic leading-none">Library</h1>
        <UiButton :disabled="library.isScanning" @click="library.scan">
          {{ library.isScanning ? 'Searching' : 'Find games' }}
        </UiButton>
        <UiButton variant="primary" @click="library.browse">Add game</UiButton>
      </div>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div class="mr-auto flex flex-wrap gap-1.5">
          <UiButton
            v-for="filter in FILTERS"
            :key="filter"
            :active="preferences.filter === filter"
            @click="preferences.filter = filter"
          >
            {{ FILTER_LABELS[filter] }}
          </UiButton>
        </div>
        <div class="flex flex-wrap items-center gap-1.5">
          <UiSelect v-model="preferences.statusFilter" label="Status" :options="statusOptions" />
          <UiSelect v-model="preferences.sort" label="Sort by" :options="sortOptions" />
          <UiButton :active="preferences.layout === 'grid'" @click="preferences.layout = 'grid'">
            Covers
          </UiButton>
          <UiButton :active="preferences.layout === 'list'" @click="preferences.layout = 'list'">
            List
          </UiButton>
        </div>
      </div>
    </div>

    <div class="overflow-y-auto overflow-x-hidden px-5 pb-5">
      <EmptyShelf v-if="library.isLoaded && library.games.length === 0" />

      <div
        v-else-if="library.isLoaded && visible.length === 0"
        class="panel-in grid justify-items-start py-6 gap-2"
      >
        <p class="text-dim">No game matches this search and filter.</p>
        <UiButton @click="showEverything">Show all games</UiButton>
      </div>

      <TransitionGroup
        v-else-if="preferences.layout === 'grid'"
        tag="div"
        name="shelf"
        appear
        class="grid grid-cols-[repeat(auto-fill,minmax(188px,1fr))] pt-1 gap-4"
      >
        <div
          v-for="(game, index) in visible"
          :key="game.id"
          :style="{ '--order': Math.min(index, 14) }"
        >
          <GameCard :game="game" />
        </div>
      </TransitionGroup>

      <TransitionGroup v-else tag="div" name="rows" appear>
        <GameRow
          v-for="(game, index) in visible"
          :key="game.id"
          :game="game"
          :style="{ '--order': Math.min(index, 14) }"
        />
      </TransitionGroup>
    </div>
  </div>
</template>
