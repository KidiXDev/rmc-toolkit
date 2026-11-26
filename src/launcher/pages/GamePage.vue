<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import UiButton from '@/ui/UiButton.vue'
import UiConfirmButton from '@/ui/UiConfirmButton.vue'

import type { GameInfo } from '../api'
import FavoriteButton from '../components/FavoriteButton.vue'
import FocusLines from '../components/FocusLines.vue'
import GameActionBar from '../components/GameActionBar.vue'
import GameCover from '../components/GameCover.vue'
import PlayButton from '../components/PlayButton.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { engineLabel, playSummary } from '../format'
import { cheatNeedsAttention, defaultGameTab, isEditableTarget, isLiveReady } from '../gamePage'
import { useLibrary } from '../library'
import { useNavigation, type GameTabId } from '../navigation'
import ActivityTab from './ActivityTab.vue'
import CheatsTab from './CheatsTab.vue'
import DetailsTab from './DetailsTab.vue'
import LiveTab from './LiveTab.vue'
import LogsTab from './LogsTab.vue'
import OverviewTab from './OverviewTab.vue'
import SavesTab from './SavesTab.vue'

const { game } = defineProps<{ game: GameInfo }>()

const TABS = [
  { id: 'overview', label: 'Overview', component: OverviewTab },
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

const requestedTab = () => (navigation.page.name === 'game' ? navigation.page.tab : undefined)
const tabs = computed(() => TABS.filter((tab) => game.engine !== 'VX Ace' || tab.id !== 'live'))
const activeId = ref<GameTabId>(defaultGameTab(game, requestedTab()))
const active = computed(() => tabs.value.find((tab) => tab.id === activeId.value) ?? TABS[0])

const isLiveTab = computed(() => active.value.id === 'live' && game.status !== 'missing')

const contentWidth = computed(() => {
  if (active.value.id === 'live') return 'max-w-[1240px]'
  if (active.value.id === 'overview') return 'max-w-[1040px]'
  return 'max-w-[720px]'
})

function openTab(tab: GameTabId) {
  activeId.value = tab
}

watch(requestedTab, (tab) => {
  if (tab) activeId.value = defaultGameTab(game, tab)
})

function goBack(event: KeyboardEvent) {
  if (event.key === 'Escape' && !isEditableTarget(event.target)) {
    navigation.openLibrary()
  }
}

onMounted(() => window.addEventListener('keydown', goBack))
onBeforeUnmount(() => window.removeEventListener('keydown', goBack))
</script>

<template>
  <div
    class="h-full"
    :class="
      isLiveTab
        ? 'grid grid-rows-[auto_auto_auto_minmax(0,1fr)] overflow-hidden'
        : 'overflow-y-auto'
    "
  >
    <section
      v-if="isLiveTab"
      class="relative grid h-[100px] grid-cols-[260px_minmax(0,1fr)_auto] items-center overflow-hidden border-b-outline border-ink bg-paper pr-5 gap-4"
    >
      <FocusLines :boiling="game.session !== null" />
      <div class="cover-panel relative h-full bg-ink pr-[5px]">
        <div class="cover-panel h-full"><GameCover :game="game" /></div>
        <div class="absolute left-2.5 top-2.5 grid grid-flow-col items-center gap-1.5">
          <UiButton @click="navigation.openLibrary">Library</UiButton>
          <FavoriteButton :game="game" />
        </div>
      </div>
      <div class="relative min-w-0">
        <div class="grid grid-flow-col items-center justify-start gap-2">
          <h1
            class="truncate bg-paper px-1 font-display text-xl font-extrabold italic leading-tight"
            :title="game.title"
          >
            {{ game.title }}
          </h1>
          <StatusBadge :status="game.status" />
        </div>
        <p class="mt-0.5 inline-block bg-paper px-1 text-xs text-dim">{{ engineLabel(game) }}</p>
      </div>
      <div class="relative grid grid-flow-col items-center gap-2">
        <PlayButton :game="game" />
        <UiConfirmButton
          v-if="game.session !== null"
          title="Unsaved progress is lost"
          @confirm="library.stop(game)"
        >
          Force stop
        </UiConfirmButton>
      </div>
    </section>

    <section
      v-else
      class="hero-in relative grid h-[250px] grid-cols-[56%_minmax(0,1fr)] grid-rows-1 overflow-hidden border-b-outline border-ink bg-paper"
    >
      <FocusLines :boiling="game.session !== null" />
      <div class="cover-panel cover-panel-outer relative h-full bg-ink pr-[5px]">
        <div class="cover-panel h-full"><GameCover :game="game" /></div>
      </div>
      <div class="relative grid content-center justify-items-center px-4 text-center gap-2">
        <h1
          class="line-clamp-3 max-w-full break-words bg-paper px-2 pb-0.5 font-display font-extrabold italic leading-tight"
          :class="game.title.length > LONG_TITLE ? 'text-xl' : 'text-3xl'"
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

    <GameActionBar v-if="game.status !== 'missing'" :game="game" @open-tab="openTab" />

    <div
      class="sticky top-0 z-10 flex flex-wrap items-center justify-between border-b-hairline bg-paper px-5 py-2 gap-2"
    >
      <div class="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Game">
        <UiButton
          v-for="tab in tabs"
          :key="tab.id"
          role="tab"
          :aria-selected="tab.id === active.id"
          :active="tab.id === active.id"
          @click="openTab(tab.id)"
        >
          <span class="grid grid-flow-col items-center gap-1.5">
            <span>{{ tab.label }}</span>
            <span
              v-if="tab.id === 'live' && isLiveReady(game)"
              class="playing-dot !h-2 !w-2"
              aria-hidden="true"
            />
            <span
              v-else-if="tab.id === 'cheats' && cheatNeedsAttention(game)"
              class="h-2 w-2 rounded-full bg-accent"
              aria-hidden="true"
            />
          </span>
        </UiButton>
      </div>
      <span class="text-dim">{{ playSummary(game) }}</span>
    </div>

    <div
      class="px-5 py-3"
      :class="[contentWidth, isLiveTab && 'min-h-0 overflow-hidden']"
      role="tabpanel"
      :aria-label="active.label"
    >
      <p v-if="game.status === 'missing'" class="text-dim">
        {{ game.path }} is not available. Plug in its drive, or use the button above if you moved
        it.
      </p>
      <div v-else :key="active.id" class="panel-in" :class="isLiveTab && 'h-full min-h-0'">
        <OverviewTab v-if="active.id === 'overview'" :game="game" @open-tab="openTab" />
        <component :is="active.component" v-else :game="game" />
      </div>
    </div>
  </div>
</template>
