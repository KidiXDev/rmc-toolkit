<script setup lang="ts">
import UiButton from '@/ui/UiButton.vue'

import type { GameInfo } from '../api'
import PlayButton from '../components/PlayButton.vue'
import { useLibrary } from '../library'
import LiveControls from './LiveControls.vue'

defineProps<{ game: GameInfo }>()

const library = useLibrary()
</script>

<template>
  <div class="h-full min-h-0">
    <LiveControls
      v-if="game.status === 'current' && game.session !== null"
      :id="game.id"
      :key="`${game.id}-${game.session.startedAt}`"
    />
    <section
      v-else-if="game.status === 'current'"
      class="panel-in grid justify-items-start rounded-window border-outline border-ink bg-panel p-5 shadow-control gap-2.5"
    >
      <h2 class="font-display text-lg font-extrabold italic">Ready for live controls</h2>
      <p class="max-w-[540px] text-sm text-dim">
        Start the game and load a save to adjust gold, speed, party HP/MP, map coordinates, battles,
        inventory, switches, and variables in real time.
      </p>
      <div class="pt-1">
        <PlayButton :game="game" />
      </div>
    </section>
    <section
      v-else
      class="panel-in grid justify-items-start rounded-window border-outline border-ink bg-panel p-5 shadow-control gap-2.5"
    >
      <h2 class="font-display text-lg font-extrabold italic">
        {{
          game.session !== null
            ? 'Close the game to update cheats'
            : game.status === 'outdated'
              ? 'Update cheats to enable live controls'
              : 'Install cheats to enable live controls'
        }}
      </h2>
      <p class="max-w-[540px] text-sm text-dim">
        {{
          game.session !== null
            ? 'Live controls require the latest cheats. Close the running game first, then update.'
            : 'The live bridge runs through the installed cheat window. Install the latest version, then play.'
        }}
      </p>
      <UiButton
        v-if="game.session === null"
        variant="primary"
        :disabled="library.busyIds.has(game.id)"
        @click="library.install(game)"
      >
        {{ game.status === 'outdated' ? 'Update cheats' : 'Install cheats' }}
      </UiButton>
    </section>
  </div>
</template>
