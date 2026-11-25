<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import UiButton from '@/ui/UiButton.vue'
import UiConfirmButton from '@/ui/UiConfirmButton.vue'

import type { GameInfo } from '../api'
import FavoriteButton from '../components/FavoriteButton.vue'
import FocusLines from '../components/FocusLines.vue'
import GameCover from '../components/GameCover.vue'
import PlayButton from '../components/PlayButton.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { engineLabel, playSummary } from '../format'
import { useLibrary } from '../library'
import { useNavigation } from '../navigation'
import ActivityTab from './ActivityTab.vue'
import CheatsTab from './CheatsTab.vue'
import DetailsTab from './DetailsTab.vue'
import LiveTab from './LiveTab.vue'
import LogsTab from './LogsTab.vue'
import SavesTab from './SavesTab.vue'

defineProps<{ game: GameInfo }>()

const TABS = [
  { id: 'cheats', label: 'Cheats', component: CheatsTab },
  { id: 'live', label: 'Live', component: LiveTab },
  { id: 'activity', label: 'Activity', component: ActivityTab },
  { id: 'saves', label: 'Saves', component: SavesTab },
  { id: 'details', label: 'Details', component: DetailsTab },
  { id: 'logs', label: 'Logs', component: LogsTab },
] as const

const LONG_TITLE = 36

const library = useLibrary()
const navigation = useNavigation()
const active = ref<(typeof TABS)[number]>(TABS[0])

function goBack(event: KeyboardEvent) {
  if (event.key === 'Escape' && !(event.target instanceof HTMLInputElement)) {
    navigation.openLibrary()
  }
}

onMounted(() => window.addEventListener('keydown', goBack))
onBeforeUnmount(() => window.removeEventListener('keydown', goBack))
</script>

<template>
  <div class="h-full overflow-y-auto">
    <section
      class="hero-in relative grid grid-cols-[56%_minmax(0,1fr)] grid-rows-1 overflow-hidden border-b-outline border-ink bg-paper"
      :class="active.id === 'live' ? 'h-[210px]' : 'h-[270px]'"
    >
      <FocusLines :boiling="game.session !== null" />
      <div class="cover-panel cover-panel-outer relative h-full bg-ink pr-[5px]">
        <div class="cover-panel h-full"><GameCover :game="game" /></div>
      </div>
      <div class="relative grid content-center justify-items-center px-4 text-center gap-2">
        <h1
          class="line-clamp-3 max-w-full break-words bg-paper px-2 pb-0.5 font-display font-extrabold italic leading-[1.1]"
          :class="game.title.length > LONG_TITLE ? 'text-[22px]' : 'text-[28px]'"
          :title="game.title"
        >
          {{ game.title }}
        </h1>
        <p class="bg-paper px-2 text-dim">{{ engineLabel(game) }}</p>
        <div class="hero-play my-1 grid justify-items-center gap-2">
          <PlayButton :game="game" size="large" />
          <UiConfirmButton
            v-if="game.session !== null"
            title="Unsaved progress is lost"
            @confirm="library.stop(game)"
          >
            Force stop
          </UiConfirmButton>
        </div>
        <p v-if="game.executable === null && game.status !== 'missing'" class="bg-paper px-2">
          Choose the game program under Details to play.
        </p>
        <UiButton v-if="game.status === 'missing'" @click="library.locate(game)">
          Find its new folder
        </UiButton>
      </div>
      <div class="absolute left-3 top-3 grid grid-flow-col items-center gap-2">
        <UiButton @click="navigation.openLibrary">Library</UiButton>
        <FavoriteButton :game="game" />
        <StatusBadge :status="game.status" />
      </div>
    </section>

    <div class="flex flex-wrap items-center justify-between border-b-hairline px-5 py-2.5 gap-2">
      <div class="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Game">
        <UiButton
          v-for="tab in TABS"
          :key="tab.id"
          role="tab"
          :aria-selected="tab.id === active.id"
          :active="tab.id === active.id"
          @click="active = tab"
        >
          {{ tab.label }}
        </UiButton>
      </div>
      <span class="text-dim">{{ playSummary(game) }}</span>
    </div>

    <div
      class="px-5 py-4"
      :class="active.id === 'live' ? 'max-w-[880px]' : 'max-w-[720px]'"
      role="tabpanel"
      :aria-label="active.label"
    >
      <p v-if="game.status === 'missing'" class="text-dim">
        {{ game.path }} is not available. Plug in its drive, or use the button above if you moved
        it.
      </p>
      <div v-else :key="active.id" class="panel-in">
        <component :is="active.component" :game="game" />
      </div>
    </div>
  </div>
</template>
