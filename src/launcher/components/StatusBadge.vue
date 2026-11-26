<script setup lang="ts">
import { computed } from 'vue'

import type { CheatStatus } from '../api'

const { status } = defineProps<{ status: CheatStatus }>()

const BADGES: Record<CheatStatus, { text: string; tone: string } | null> = {
  current: { text: 'Cheats on', tone: 'bg-primary text-onfill' },
  outdated: { text: 'Update', tone: 'bg-accent text-onfill' },
  standalone: { text: 'Cheats on', tone: 'bg-primary text-onfill' },
  missing: { text: 'Not found', tone: 'bg-panel text-ink' },
  notInstalled: null,
}

const badge = computed(() => BADGES[status])
</script>

<template>
  <span
    v-if="badge"
    class="rounded-full border-hairline border-ink px-2 text-[11px] font-bold leading-[18px]"
    :class="badge.tone"
  >
    {{ badge.text }}
  </span>
</template>
