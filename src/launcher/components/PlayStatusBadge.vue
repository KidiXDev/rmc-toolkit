<script setup lang="ts">
import { computed } from 'vue'

import type { PlayStatus } from '../api'
import { PLAY_STATUS_LABELS } from '../librarySort'

const { status } = defineProps<{ status: PlayStatus }>()

const TONES: Record<PlayStatus, string | null> = {
  unsorted: null,
  planned: 'bg-panel text-ink',
  playing: 'bg-accent text-onfill',
  finished: 'bg-primary text-onfill',
  dropped: 'bg-panel text-dim',
}

const tone = computed(() => TONES[status])
</script>

<template>
  <span
    v-if="tone"
    class="inline-block rounded-full border-hairline border-ink px-2 text-xs font-bold leading-tight"
    :class="tone"
  >
    {{ PLAY_STATUS_LABELS[status] }}
  </span>
</template>
