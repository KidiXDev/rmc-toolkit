<script setup lang="ts">
import { computed } from 'vue'

import type { PlaySession } from '../api'
import { formatDate, formatDuration } from '../format'
import { useLibrary } from '../library'

const {
  sessions,
  showGame = false,
  limit = 40,
} = defineProps<{
  sessions: PlaySession[]
  showGame?: boolean
  limit?: number
}>()

const library = useLibrary()

const rows = computed(() =>
  [...sessions]
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, limit)
    .map((session) => ({
      key: `${session.game}-${session.startedAt}`,
      title: library.gameById(session.game)?.title ?? 'Removed game',
      date: formatDate(session.startedAt),
      played: formatDuration(session.playedMs),
      isOutside: session.origin === 'outside',
    })),
)
</script>

<template>
  <p v-if="rows.length === 0" class="py-1 text-dim">Nothing yet. Play something.</p>
  <div
    v-for="row in rows"
    :key="row.key"
    class="grid grid-cols-[minmax(0,1fr)_auto_110px] items-center border-b-hairline py-1.5 gap-4 hover:bg-panel"
  >
    <span class="truncate" :class="showGame && 'font-bold'">
      {{ showGame ? row.title : row.date }}
      <span v-if="row.isOutside" class="text-[11px] font-medium text-dim">
        started outside the launcher
      </span>
    </span>
    <span class="text-[12px] text-dim">{{ showGame ? row.date : '' }}</span>
    <span class="text-right font-mono text-[12px]">{{ row.played }}</span>
  </div>
</template>
