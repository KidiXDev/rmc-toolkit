<script setup lang="ts">
import { computed } from 'vue'

import { vFx } from '@/themes/activeEffects'

import type { GameInfo } from '../api'
import { useLibrary } from '../library'

const { game, size = 'small' } = defineProps<{ game: GameInfo; size?: 'small' | 'large' }>()

const library = useLibrary()

const label = computed(() => (game.isRunning ? 'Playing' : 'Play'))
const isDisabled = computed(
  () => game.isRunning || game.executable === null || library.busyIds.has(game.id),
)
</script>

<template>
  <button
    v-fx:action
    type="button"
    class="border-outline border-ink bg-accent font-display font-extrabold italic text-ink"
    :class="
      size === 'large'
        ? 'rounded-window px-12 py-2.5 text-[26px] leading-none shadow-window'
        : 'rounded-control px-4 py-0.5 text-[14px] shadow-control'
    "
    :disabled="isDisabled"
    :title="game.executable === null ? 'The game program was not found' : undefined"
    @click.stop="library.play(game)"
  >
    {{ label }}
  </button>
</template>
