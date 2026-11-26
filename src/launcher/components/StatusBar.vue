<script setup lang="ts">
import { vFx } from '@/themes/activeEffects'
import UiButton from '@/ui/UiButton.vue'

import { countLabel } from '../format'
import { isLiveReady } from '../gamePage'
import { useLibrary } from '../library'
import { useNavigation } from '../navigation'
import LiveTimer from './LiveTimer.vue'

const library = useLibrary()
const navigation = useNavigation()
</script>

<template>
  <footer
    class="grid h-10 grid-cols-[minmax(0,1fr)_auto_auto] items-center border-t-outline border-ink bg-panel px-4 gap-4"
  >
    <span class="truncate">
      <template v-if="library.running.length > 0">
        <button
          v-for="game in library.running"
          :key="game.id"
          type="button"
          class="smooth mr-3 inline-block rounded-control px-1.5 py-0.5 text-left hover:bg-soft"
          :title="`Open ${game.title}`"
          @click="navigation.openGame(game.id, isLiveReady(game) ? 'live' : 'overview')"
        >
          <span class="grid grid-flow-col items-center gap-1.5">
            <span class="playing-dot !h-2 !w-2" aria-hidden="true" />
            <span>Playing {{ game.title }}</span>
            <LiveTimer :game="game" />
          </span>
        </button>
      </template>
      <template v-else>{{ countLabel(library.games.length, 'game') }}</template>
    </span>
    <div
      v-if="library.progress !== null"
      v-fx:progress
      role="progressbar"
      class="h-4 w-[180px] overflow-hidden rounded-full border-outline border-ink bg-paper"
      aria-label="Updating cheats"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="library.progress"
    >
      <i class="progress-fill block h-full bg-accent" :style="{ width: `${library.progress}%` }" />
    </div>
    <UiButton v-else-if="library.outdated.length > 0" @click="library.updateAll">
      Update cheats in {{ countLabel(library.outdated.length, 'game') }}
    </UiButton>
    <span class="font-mono text-[11px] text-dim">{{ library.version }}</span>
  </footer>
</template>
