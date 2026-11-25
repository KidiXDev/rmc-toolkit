<script setup lang="ts">
import { vFx } from '@/themes/activeEffects'
import UiButton from '@/ui/UiButton.vue'

import { countLabel } from '../format'
import { useLibrary } from '../library'
import LiveTimer from './LiveTimer.vue'

const library = useLibrary()
</script>

<template>
  <footer
    class="grid h-10 grid-cols-[minmax(0,1fr)_auto_auto] items-center border-t-outline border-ink bg-panel px-4 gap-4"
  >
    <span class="truncate">
      <template v-if="library.running.length > 0">
        <span v-for="game in library.running" :key="game.id" class="mr-4">
          Playing {{ game.title }} <LiveTimer :game="game" />
        </span>
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
