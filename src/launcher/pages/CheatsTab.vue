<script setup lang="ts">
import { onMounted, ref } from 'vue'

import UiButton from '@/ui/UiButton.vue'
import UiCheckbox from '@/ui/UiCheckbox.vue'
import UiConfirmButton from '@/ui/UiConfirmButton.vue'
import UiSection from '@/ui/UiSection.vue'

import { cheatErrors, type CheatError, type GameInfo } from '../api'
import { cheatLabel } from '../format'
import { useLibrary } from '../library'

const { game } = defineProps<{ game: GameInfo }>()

const SHORTCUTS = [
  { keys: 'Ctrl+C', action: 'Show or hide the cheat window' },
  { keys: 'Ctrl+S', action: 'Quick save' },
  { keys: 'Ctrl+L', action: 'Quick load' },
  { keys: 'Ctrl+N', action: 'No-clip' },
  { keys: '`', action: 'Fast-forward while held' },
]

const library = useLibrary()
const removeSettings = ref(false)
const errors = ref<CheatError[]>([])

onMounted(async () => {
  errors.value = await cheatErrors(game.id).catch(() => [])
})
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
        :disabled="game.isRunning || library.busyIds.has(game.id)"
        @click="library.install(game)"
      >
        {{ game.status === 'outdated' ? 'Update cheats' : 'Install cheats' }}
      </UiButton>
      <template v-if="game.status !== 'notInstalled'">
        <UiConfirmButton
          :disabled="game.isRunning || library.busyIds.has(game.id)"
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

  <UiSection v-if="errors.length > 0" title="Problems reported by the cheat window">
    <details
      v-for="error in errors"
      :key="error.time + error.message"
      class="border-b-hairline py-1"
    >
      <summary class="cursor-pointer truncate">
        {{ error.message.split('\n')[0] }}
      </summary>
      <pre class="m-0 select-text overflow-x-auto py-1 font-mono text-[11px] text-dim"
        >{{ error.time }} {{ error.version }}
{{ error.message }}</pre>
    </details>
  </UiSection>
</template>
