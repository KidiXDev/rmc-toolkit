<script setup lang="ts">
import { computed } from 'vue'

import UiButton from '@/ui/UiButton.vue'
import UiSelect from '@/ui/UiSelect.vue'

import GameCard from '../components/GameCard.vue'
import GameRow from '../components/GameRow.vue'
import { useLibrary } from '../library'
import { arrangeGames, FILTER_LABELS, FILTERS, SORT_LABELS, SORTS } from '../librarySort'
import { useNavigation } from '../navigation'
import { usePreferences } from '../preferences'

const library = useLibrary()
const navigation = useNavigation()
const preferences = usePreferences()

const sortOptions = SORTS.map((value) => ({ value, label: SORT_LABELS[value] }))

const visible = computed(() =>
  arrangeGames(library.games, navigation.query, preferences.filter, preferences.sort),
)

function showEverything() {
  navigation.query = ''
  preferences.filter = 'all'
}
</script>

<template>
  <div class="grid h-full grid-rows-[auto_minmax(0,1fr)]">
    <div class="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center px-5 pb-3 pt-4 gap-3">
      <div class="grid grid-flow-col justify-start gap-1.5">
        <UiButton
          v-for="filter in FILTERS"
          :key="filter"
          :active="preferences.filter === filter"
          @click="preferences.filter = filter"
        >
          {{ FILTER_LABELS[filter] }}
        </UiButton>
      </div>
      <div class="grid grid-flow-col items-center gap-1.5">
        <UiSelect v-model="preferences.sort" label="Sort by" :options="sortOptions" />
        <UiButton
          :active="preferences.layout === 'grid'"
          title="Show covers"
          @click="preferences.layout = 'grid'"
        >
          Covers
        </UiButton>
        <UiButton
          :active="preferences.layout === 'list'"
          title="Show a list"
          @click="preferences.layout = 'list'"
        >
          List
        </UiButton>
      </div>
      <div class="grid grid-flow-col gap-1.5">
        <UiButton :disabled="library.isScanning" @click="library.scan">
          {{ library.isScanning ? 'Searching' : 'Find games' }}
        </UiButton>
        <UiButton variant="primary" @click="library.browse">Add game</UiButton>
      </div>
    </div>

    <div class="overflow-y-auto px-5 pb-5">
      <div
        v-if="library.isLoaded && library.games.length === 0"
        class="grid h-full place-content-center justify-items-center rounded-window border-outline border-dashed border-ink bg-panel text-center gap-2"
      >
        <h2 class="font-display text-[28px] font-extrabold italic">Your shelf is empty</h2>
        <p class="mb-2 w-[340px] text-dim">
          Drop game folders anywhere in this window, or let the launcher look through a folder for
          you.
        </p>
        <UiButton variant="primary" @click="library.scan">Find games</UiButton>
      </div>

      <div
        v-else-if="library.isLoaded && visible.length === 0"
        class="grid justify-items-start py-6 gap-2"
      >
        <p class="text-dim">No game matches this search and filter.</p>
        <UiButton @click="showEverything">Show all games</UiButton>
      </div>

      <div
        v-else-if="preferences.layout === 'grid'"
        class="grid grid-cols-[repeat(auto-fill,minmax(188px,1fr))] pt-1 gap-4"
      >
        <GameCard v-for="game in visible" :key="game.id" :game="game" />
      </div>

      <div v-else>
        <GameRow v-for="game in visible" :key="game.id" :game="game" />
      </div>
    </div>
  </div>
</template>
