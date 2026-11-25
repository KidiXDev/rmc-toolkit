<script setup lang="ts">
import UiButton from '@/ui/UiButton.vue'

import type { GameInfo } from '../api'
import { useLibrary } from '../library'
import LiveControls from './LiveControls.vue'

defineProps<{ game: GameInfo }>()

const library = useLibrary()
</script>

<template>
  <LiveControls
    v-if="game.status === 'current' && game.session !== null"
    :id="game.id"
    :key="`${game.id}-${game.session.startedAt}`"
  />
  <p v-else-if="game.status === 'current'" class="text-dim">
    Play this game, then start a new game or load a save to use live controls.
  </p>
  <div v-else class="grid justify-items-start gap-2">
    <p v-if="game.session !== null" class="text-dim">
      Close the game to install the current cheats.
    </p>
    <template v-else>
      <p class="text-dim">
        Install the current cheats to enable live controls, then play the game.
      </p>
      <UiButton
        variant="primary"
        :disabled="library.busyIds.has(game.id)"
        @click="library.install(game)"
      >
        {{ game.status === 'outdated' ? 'Update cheats' : 'Install cheats' }}
      </UiButton>
    </template>
  </div>
</template>
