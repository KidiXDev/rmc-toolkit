<script setup lang="ts">
import type { GameInfo } from '../api'
import { formatPlaytime } from '../format'
import { useNavigation } from '../navigation'
import FavoriteButton from './FavoriteButton.vue'
import GameCover from './GameCover.vue'
import PlayButton from './PlayButton.vue'
import PlayStatusBadge from './PlayStatusBadge.vue'
import StatusBadge from './StatusBadge.vue'

defineProps<{ game: GameInfo }>()

const navigation = useNavigation()
</script>

<template>
  <article
    class="game-card relative cursor-pointer overflow-hidden rounded-control border-outline border-ink bg-paper shadow-control"
    @click="navigation.openGame(game.id)"
  >
    <div class="relative aspect-[4/3] overflow-hidden border-b-outline border-ink">
      <div class="cover-zoom h-full overflow-hidden"><GameCover :game="game" /></div>
      <span class="absolute left-2 top-2"><StatusBadge :status="game.status" /></span>
      <span class="absolute right-1.5 top-1.5" :class="!game.favorite && 'reveal'">
        <FavoriteButton :game="game" />
      </span>
      <span class="absolute bottom-2 right-2" :class="game.session === null && 'reveal'">
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
      <div class="mt-0.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5">
        <p class="truncate text-xs text-dim">
          {{ game.session ? 'Playing now' : formatPlaytime(game.playMs) }}
        </p>
        <PlayStatusBadge :status="game.playStatus" />
      </div>
    </div>
  </article>
</template>
