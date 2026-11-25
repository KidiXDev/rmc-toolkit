<script setup lang="ts">
import { computed } from 'vue'

import { useDrag } from '@/overlay/useDrag'
import { clampToViewport, useViewport } from '@/overlay/useViewport'
import { useSettings } from '@/stores/settings'

import MapCanvas from './MapCanvas.vue'

const SIZE = 168
const HANDLE_HEIGHT = 14
const CELL = 8

const settings = useSettings()
const viewport = useViewport()

const position = computed(() => ({
  x: clampToViewport(settings.minimapX, SIZE, viewport.width),
  y: clampToViewport(settings.minimapY, SIZE + HANDLE_HEIGHT, viewport.height),
}))

const { handlers } = useDrag({
  position: () => position.value,
  onMove: ({ x, y }) => {
    settings.minimapX = clampToViewport(x, SIZE, viewport.width)
    settings.minimapY = clampToViewport(y, SIZE + HANDLE_HEIGHT, viewport.height)
  },
})
</script>

<template>
  <div
    class="pointer-events-auto fixed overflow-hidden rounded-control border-outline border-ink bg-paper shadow-control"
    :style="{
      left: `${position.x}px`,
      top: `${position.y}px`,
      opacity: settings.minimapOpacity,
    }"
  >
    <div
      class="cursor-move touch-none border-b-outline border-ink bg-soft"
      :style="{ height: `${HANDLE_HEIGHT}px` }"
      v-on="handlers"
    />
    <MapCanvas :width="SIZE" :height="SIZE" :zoom="CELL" />
  </div>
</template>
