<script setup lang="ts">
import { ref } from 'vue'

import type { GameInfo } from '../api'
import { useLibrary } from '../library'

const { game } = defineProps<{ game: GameInfo }>()

const library = useLibrary()
const isPopping = ref(false)

async function toggle() {
  isPopping.value = false
  await library.toggleFavorite(game)
  isPopping.value = game.favorite
}
</script>

<template>
  <button
    type="button"
    class="smooth grid h-7 w-7 place-items-center rounded-full border-outline border-ink bg-paper hover:bg-soft"
    :aria-pressed="game.favorite"
    :aria-label="game.favorite ? 'Remove from favorites' : 'Add to favorites'"
    :title="game.favorite ? 'Remove from favorites' : 'Add to favorites'"
    @click.stop="toggle"
  >
    <svg
      viewBox="0 0 20 20"
      class="h-4 w-4"
      :class="isPopping && 'fx-star'"
      stroke="var(--rmc-ink)"
      stroke-width="1.8"
    >
      <path
        :fill="game.favorite ? 'var(--rmc-accent)' : 'none'"
        stroke-linejoin="round"
        d="M10 2l2.5 5.2 5.7.7-4.2 3.9 1.1 5.7L10 14.7l-5.1 2.8L6 11.8 1.8 7.9l5.7-.7z"
      />
    </svg>
  </button>
</template>
