<script setup lang="ts">
import { ref } from 'vue'

import UiButton from '@/ui/UiButton.vue'
import UiCheckbox from '@/ui/UiCheckbox.vue'
import UiConfirmButton from '@/ui/UiConfirmButton.vue'
import UiSection from '@/ui/UiSection.vue'

import type { GameInfo } from '../api'
import { cheatLabel } from '../format'
import { useLibrary } from '../library'

defineProps<{ game: GameInfo }>()

const SHORTCUTS = [
  { keys: 'Ctrl+C', action: 'Show or hide the cheat window' },
  { keys: 'Ctrl+S', action: 'Quick save' },
  { keys: 'Ctrl+L', action: 'Quick load' },
  { keys: 'Ctrl+N', action: 'No-clip' },
  { keys: '`', action: 'Fast-forward while held' },
]

const library = useLibrary()
const removeSettings = ref(false)
</script>

<template>
  <UiSection title="Cheat window">
    <p class="py-2">{{ cheatLabel(game) }}.</p>
    <p v-if="!game.isSupported" class="mb-2 text-danger">
      This game was made with RPG Maker {{ game.engine }} {{ game.makerVersion }}. The cheat window
      needs 1.6 or newer and may not open.
    </p>
    <div class="grid grid-flow-col items-center justify-start pb-2 gap-3">
      <UiButton
        v-if="game.status !== 'current'"
        variant="primary"
        :disabled="game.session !== null || library.busyIds.has(game.id)"
        @click="library.install(game)"
      >
        {{ game.status === 'outdated' ? 'Update cheats' : 'Install cheats' }}
      </UiButton>
      <template v-if="game.status !== 'notInstalled'">
        <UiConfirmButton
          :disabled="game.session !== null || library.busyIds.has(game.id)"
          @confirm="library.uninstall(game, removeSettings)"
        >
          Remove cheats
        </UiConfirmButton>
        <UiCheckbox v-model="removeSettings" label="Also remove cheat settings" />
      </template>
    </div>
  </UiSection>

  <UiSection title="Keys in the game">
    <div
      v-for="shortcut in SHORTCUTS"
      :key="shortcut.keys"
      class="grid grid-cols-[90px_1fr] items-center border-b-hairline py-1"
    >
      <kbd class="font-mono text-[12px] font-bold">{{ shortcut.keys }}</kbd>
      {{ shortcut.action }}
    </div>
    <p class="pt-1.5 text-[12px] text-dim">You can change these in the cheat window.</p>
  </UiSection>
</template>
