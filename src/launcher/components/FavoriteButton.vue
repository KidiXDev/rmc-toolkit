<script setup lang="ts">
import type { GameInfo } from '../api'
import { useLibrary } from '../library'

const { game } = defineProps<{ game: GameInfo }>()

const library = useLibrary()
</script>

<template>
  <button
    type="button"
    class="grid h-7 w-7 place-items-center rounded-full border-outline border-ink bg-paper"
    :aria-pressed="game.favorite"
    :aria-label="game.favorite ? 'Remove from favorites' : 'Add to favorites'"
    :title="game.favorite ? 'Remove from favorites' : 'Add to favorites'"
    @click.stop="library.toggleFavorite(game)"
  >
    <svg viewBox="0 0 20 20" class="h-4 w-4" stroke="var(--rmc-ink)" stroke-width="1.8">
      <path
        :fill="game.favorite ? 'var(--rmc-accent)' : 'none'"
        stroke-linejoin="round"
        d="M10 2l2.5 5.2 5.7.7-4.2 3.9 1.1 5.7L10 14.7l-5.1 2.8L6 11.8 1.8 7.9l5.7-.7z"
      />
    </svg>
  </button>
</template>
