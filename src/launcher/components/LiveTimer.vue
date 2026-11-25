<script setup lang="ts">
import { computed } from 'vue'

import type { GameInfo } from '../api'
import { formatClock } from '../format'
import { useLibrary } from '../library'
import { useNow } from '../useNow'

const { game } = defineProps<{ game: GameInfo }>()

const library = useLibrary()
const now = useNow()

const elapsed = computed(() => {
  if (!game.session) return 0
  return game.session.playedMs + Math.max(0, now.value - library.fetchedAt)
})
</script>

<template>
  <span class="font-mono tabular-nums">{{ formatClock(elapsed) }}</span>
</template>
