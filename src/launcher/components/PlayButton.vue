<script setup lang="ts">
import { computed } from 'vue'

import { vFx } from '@/themes/activeEffects'

import type { GameInfo } from '../api'
import { useLibrary } from '../library'
import LiveTimer from './LiveTimer.vue'

const { game, size = 'small' } = defineProps<{ game: GameInfo; size?: 'small' | 'large' }>()

const library = useLibrary()

const isRunning = computed(() => game.session !== null)
const isDisabled = computed(
  () => isRunning.value || game.executable === null || library.busyIds.has(game.id),
)
</script>

<template>
  <span
    v-if="isRunning"
    class="grid grid-flow-col items-center border-outline border-ink bg-panel font-display font-extrabold italic gap-2"
    :class="
      size === 'large'
        ? 'rounded-window px-7 py-2.5 text-[22px] leading-none'
        : 'rounded-control px-2.5 py-0.5 text-[13px]'
    "
    @click.stop
  >
    <span class="playing-dot" aria-hidden="true" />
    <LiveTimer :game="game" />
  </span>
  <button
    v-else
    v-fx:action
    type="button"
    class="smooth border-outline border-ink bg-accent font-display font-extrabold italic text-onfill enabled:hover:bg-accent-hover"
    :class="
      size === 'large'
        ? 'rounded-window px-12 py-2.5 text-[26px] leading-none shadow-window'
        : 'rounded-control px-4 py-0.5 text-[14px] shadow-control'
    "
    :disabled="isDisabled"
    :title="game.executable === null ? 'The game program was not found' : undefined"
    @click.stop="library.play(game)"
  >
    Play
  </button>
</template>
