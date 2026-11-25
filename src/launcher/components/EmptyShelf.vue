<script setup lang="ts">
import UiButton from '@/ui/UiButton.vue'

import { useLibrary } from '../library'

const library = useLibrary()
</script>

<template>
  <div
    class="grid h-full place-content-center justify-items-center rounded-window border-outline border-dashed border-ink bg-panel text-center gap-2"
  >
    <h2 class="font-display text-[28px] font-extrabold italic">Your shelf is empty</h2>
    <p class="mb-2 w-[340px] text-dim">
      Drop game folders anywhere in this window, or let the launcher look through a folder for you.
    </p>
    <UiButton variant="primary" :disabled="library.isScanning" @click="library.scan">
      {{ library.isScanning ? 'Searching' : 'Find games' }}
    </UiButton>
  </div>
</template>
