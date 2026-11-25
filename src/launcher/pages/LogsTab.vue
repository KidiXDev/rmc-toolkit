<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import UiButton from '@/ui/UiButton.vue'
import UiConfirmButton from '@/ui/UiConfirmButton.vue'
import UiSection from '@/ui/UiSection.vue'

import { clearLog, gameLog, type GameInfo } from '../api'
import { useLibrary } from '../library'
import { usePreferences } from '../preferences'

const { game } = defineProps<{ game: GameInfo }>()

const REFRESH_INTERVAL_MS = 2000

const library = useLibrary()
const preferences = usePreferences()
const log = ref('')
let timer: number | undefined

async function refresh() {
  log.value = await gameLog(game.id).catch(String)
}

async function copy() {
  const isCopied = await library.attempt(async () => {
    await refresh()
    await navigator.clipboard.writeText(log.value)
  })
  if (isCopied) library.notify('Log copied')
}

async function clear() {
  const isCleared = await library.attempt(() => clearLog(game.id))
  await refresh()
  if (isCleared) library.notify('Log cleared')
}

onMounted(() => {
  void refresh()
  timer = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS)
})
onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <UiSection title="What the cheat window did">
    <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center py-2 gap-3">
      <p class="text-[12px] text-dim">
        <template v-if="preferences.developerMode">
          Developer mode is on. Play the game, then copy this to report a problem. It contains
          folder paths and the list of plugins.
        </template>
        <template v-else>
          For a detailed log, turn on developer mode in Settings and start the game again. The log
          contains folder paths.
        </template>
      </p>
      <div class="grid grid-flow-col gap-2">
        <UiConfirmButton @confirm="clear">Clear</UiConfirmButton>
        <UiButton variant="primary" @click="copy">Copy log</UiButton>
      </div>
    </div>
    <pre
      class="m-0 max-h-[420px] select-text overflow-auto rounded-control border-hairline bg-paper p-2 font-mono text-[11px]"
      tabindex="0"
      aria-label="Log"
      >{{ log }}</pre>
  </UiSection>
</template>
