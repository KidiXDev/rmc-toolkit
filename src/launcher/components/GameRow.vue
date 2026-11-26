<script setup lang="ts">
import type { GameInfo } from '../api'
import { engineLabel, formatDate, formatPlaytime } from '../format'
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
    class="smooth grid cursor-pointer grid-cols-[64px_minmax(0,1fr)_90px_120px_150px_auto_auto] items-center border-b-hairline py-1.5 pr-1 gap-3 hover:bg-panel"
    @click="navigation.openGame(game.id)"
  >
    <span class="h-12 w-16 overflow-hidden rounded-[6px] border-hairline border-ink">
      <GameCover :game="game" />
    </span>
    <button type="button" class="min-w-0 text-left" @click.stop="navigation.openGame(game.id)">
      <span class="grid min-w-0">
        <span class="truncate text-sm font-bold">{{ game.title }}</span>
        <span class="grid grid-flow-col items-center justify-start gap-2">
          <span class="text-xs text-dim">{{ engineLabel(game) }}</span>
          <PlayStatusBadge :status="game.playStatus" />
        </span>
      </span>
    </button>
    <span><StatusBadge :status="game.status" /></span>
    <span class="text-[12px] text-dim">{{ formatPlaytime(game.playMs) }}</span>
    <span class="text-[12px] text-dim">
      {{ game.lastPlayed === null ? '' : formatDate(game.lastPlayed) }}
    </span>
    <FavoriteButton :game="game" />
    <PlayButton :game="game" />
  </article>
</template>
