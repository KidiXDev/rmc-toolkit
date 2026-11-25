<script setup lang="ts">
import { computed, ref } from 'vue'

import { useLive } from '@/engine/live'
import { currentMapLabel, rpg } from '@/engine/runtime'
import { useSettings } from '@/stores/settings'

import { useFrame } from './useFrame'

const SAMPLE_MS = 500

const CORNER_CLASSES = {
  'top-left': 'top-2 left-2',
  'top-right': 'top-2 right-2',
  'bottom-left': 'bottom-2 left-2',
  'bottom-right': 'right-2 bottom-11',
}

const settings = useSettings()
const fps = ref(0)
const mapLabel = useLive(currentMapLabel, '')
const position = useLive(() => `${rpg.$gamePlayer?.x ?? 0}, ${rpg.$gamePlayer?.y ?? 0}`, '')

let frames = 0
let sampleStart = 0

useFrame((now) => {
  frames += 1
  if (now - sampleStart < SAMPLE_MS) return
  fps.value = Math.round((frames * 1000) / (now - sampleStart))
  frames = 0
  sampleStart = now
})

const lines = computed(() =>
  [
    settings.hudFps && `FPS ${fps.value}`,
    settings.hudMap && mapLabel.value,
    settings.hudPosition && position.value,
  ].filter((line) => line !== false),
)
</script>

<template>
  <div
    v-if="lines.length > 0"
    class="pointer-events-none fixed rounded-control border-outline border-ink bg-paper px-2 py-0.5 font-mono text-[12px]"
    :class="CORNER_CLASSES[settings.hudCorner]"
  >
    <div v-for="line in lines" :key="line">{{ line }}</div>
  </div>
</template>
