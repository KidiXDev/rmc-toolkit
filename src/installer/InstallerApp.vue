<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { vFx } from '@/themes/activeEffects'
import ThemeRoot from '@/themes/ThemeRoot.vue'
import UiButton from '@/ui/UiButton.vue'
import UiToast from '@/ui/UiToast.vue'

import { onGameDrop, pickFolder } from './api'
import GameDetails from './GameDetails.vue'
import { statusLabel } from './status'
import { useInstaller } from './useInstaller'

const {
  games,
  selected,
  message,
  version,
  isBusy,
  progress,
  outdated,
  start,
  select,
  install,
  uninstall,
  forget,
  updateAll,
} = useInstaller()

const isDropTarget = ref(false)
let stopListening: (() => void) | undefined

async function browse() {
  const path = await pickFolder()
  if (path !== null) await select(path)
}

onMounted(async () => {
  void start()
  stopListening = await onGameDrop((event) => {
    isDropTarget.value = event.type === 'enter'
    if (event.type === 'drop') void select(event.path)
  })
})

onBeforeUnmount(() => stopListening?.())
</script>

<template>
  <ThemeRoot theme-id="sakuga" effects>
    <main class="min-h-screen bg-paper p-5">
      <header class="mb-3 grid grid-cols-[1fr_auto] items-end">
        <h1 class="font-display text-[26px] font-extrabold italic leading-none">RMC Toolkit</h1>
        <span class="text-dim">{{ version }}</span>
      </header>

      <section
        class="grid justify-items-center rounded-window border-outline border-dashed border-ink p-5 gap-2"
        :class="isDropTarget ? 'bg-soft' : 'bg-panel'"
      >
        <p>Drop a game folder or its exe here</p>
        <UiButton :disabled="isBusy" @click="browse">Browse</UiButton>
      </section>

      <GameDetails
        v-if="selected"
        :key="selected.path"
        :game="selected"
        :is-busy="isBusy"
        @install="install(selected.path)"
        @uninstall="(removeSettings) => selected && uninstall(selected.path, removeSettings)"
      />

      <div class="mb-1 mt-5 grid grid-cols-[1fr_auto] items-center">
        <h2 class="font-display text-[16px] font-extrabold italic">Your games</h2>
        <UiButton v-if="outdated.length > 0" :disabled="isBusy" @click="updateAll">
          Update all ({{ outdated.length }})
        </UiButton>
      </div>

      <div
        v-if="progress !== null"
        v-fx:progress
        role="progressbar"
        class="mb-2 h-4 overflow-hidden rounded-full border-outline border-ink"
        aria-label="Updating games"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="progress"
      >
        <i class="block h-full bg-accent" :style="{ width: `${progress}%` }" />
      </div>

      <p v-if="games.length === 0" class="text-dim">Games you install to appear here.</p>
      <div
        v-for="game in games"
        :key="game.path"
        class="grid min-h-[38px] grid-cols-[1fr_auto] items-center border-b-hairline gap-3"
      >
        <button
          type="button"
          class="grid text-left"
          :disabled="game.status === 'missing' || isBusy"
          :title="game.path"
          @click="select(game.path)"
        >
          <span class="truncate font-bold">{{ game.title }}</span>
          <span class="text-[11px] text-dim">{{ statusLabel(game) }}</span>
        </button>
        <UiButton v-if="game.status === 'missing'" :disabled="isBusy" @click="forget(game.path)">
          Forget
        </UiButton>
        <UiButton
          v-else-if="game.status !== 'current'"
          :disabled="isBusy"
          @click="install(game.path)"
        >
          {{ game.status === 'outdated' ? 'Update' : 'Install' }}
        </UiButton>
      </div>
    </main>

    <div class="pointer-events-none fixed bottom-4 left-4 w-[300px]">
      <UiToast
        v-if="message"
        :key="message.text"
        class="whitespace-pre-line"
        :message="message.text"
        :tone="message.tone"
        @dismiss="message = null"
      />
    </div>
  </ThemeRoot>
</template>
