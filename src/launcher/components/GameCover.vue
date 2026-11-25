<script setup lang="ts">
import { computed } from 'vue'

import type { GameInfo } from '../api'
import { coverUrl } from '../coverCache'
import DrawnCover from './DrawnCover.vue'

const { game } = defineProps<{ game: GameInfo }>()

const url = computed(() => coverUrl(game.id, game.coverKey))
</script>

<template>
  <div class="h-full w-full overflow-hidden bg-panel">
    <img
      v-if="url"
      :src="url"
      alt=""
      draggable="false"
      class="h-full w-full object-cover"
      :class="game.status === 'missing' && 'opacity-40 grayscale'"
    />
    <DrawnCover v-else :title="game.title" />
  </div>
</template>
