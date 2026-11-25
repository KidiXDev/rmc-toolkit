<script setup lang="ts">
import type { GameInfo } from '../api'
import { formatPlaytime } from '../format'
import { useNavigation } from '../navigation'
import FavoriteButton from './FavoriteButton.vue'
import GameCover from './GameCover.vue'
import PlayButton from './PlayButton.vue'
import StatusBadge from './StatusBadge.vue'

defineProps<{ game: GameInfo }>()

const navigation = useNavigation()
</script>

<template>
  <article
    class="game-card relative cursor-pointer overflow-hidden rounded-control border-outline border-ink bg-paper shadow-control"
    @click="navigation.openGame(game.id)"
  >
    <div class="relative aspect-[4/3] border-b-outline border-ink">
      <GameCover :game="game" />
      <span class="absolute left-2 top-2"><StatusBadge :status="game.status" /></span>
      <span class="absolute right-1.5 top-1.5" :class="!game.favorite && 'reveal'">
        <FavoriteButton :game="game" />
      </span>
      <span class="absolute bottom-2 right-2" :class="!game.isRunning && 'reveal'">
        <PlayButton :game="game" />
      </span>
    </div>
    <div class="px-2.5 py-1.5">
      <button
        type="button"
        class="block w-full truncate text-left text-[14px] font-bold"
        :title="game.title"
        @click.stop="navigation.openGame(game.id)"
      >
        {{ game.title }}
      </button>
      <p class="text-[11px] text-dim">{{ formatPlaytime(game.playSeconds) }}</p>
    </div>
  </article>
</template>
