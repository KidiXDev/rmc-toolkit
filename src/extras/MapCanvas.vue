<script setup lang="ts">
import { onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'

import { rpg } from '@/engine/runtime'
import { useOverlay } from '@/stores/overlay'
import { useSettings } from '@/stores/settings'
import { useShownMode } from '@/themes/themeContext'

import { drawMap, tileAt, type MapColors, type MapFrame, type MapZoom } from './mapView'
import { teleport, walkTo } from './teleport'
import { forgetTerrain } from './terrain'
import { useFrame } from './useFrame'

const { width, height, zoom } = defineProps<{ width: number; height: number; zoom: MapZoom }>()

const overlay = useOverlay()
const settings = useSettings()
const canvas = useTemplateRef('canvas')
const hovered = ref('')

let frame: MapFrame | null = null
let colors: MapColors | undefined

function readColors(element: Element): MapColors {
  const style = getComputedStyle(element)
  const color = (name: string) => style.getPropertyValue(name).trim()
  return {
    blocked: color('--rmc-track'),
    walkable: color('--rmc-paper'),
    ink: color('--rmc-ink'),
    player: color('--rmc-accent'),
  }
}

useFrame(() => {
  if (!canvas.value) return
  colors ??= readColors(canvas.value)
  frame = drawMap(canvas.value, zoom, colors)
})

function tileUnder(event: MouseEvent) {
  if (!frame || !canvas.value) return null
  const rect = canvas.value.getBoundingClientRect()
  const ratio = width / rect.width
  return tileAt(frame, (event.clientX - rect.left) * ratio, (event.clientY - rect.top) * ratio)
}

function onMove(event: MouseEvent) {
  const tile = tileUnder(event)
  hovered.value = tile ? `${tile.x}, ${tile.y}` : ''
}

function moveTo(event: MouseEvent) {
  const tile = tileUnder(event)
  const mapId = rpg.$gameMap?.mapId()
  if (!tile || !mapId) return

  const hasMoved = settings.minimapTeleport
    ? teleport(mapId, tile.x, tile.y)
    : walkTo(tile.x, tile.y)
  if (!hasMoved) overlay.notify('Moving works only on the map', 'error')
}

watch(
  useShownMode(),
  () => {
    colors = undefined
    forgetTerrain()
  },
  { flush: 'post' },
)

onBeforeUnmount(forgetTerrain)
</script>

<template>
  <canvas
    ref="canvas"
    class="block cursor-crosshair"
    :width="width"
    :height="height"
    :title="hovered"
    role="img"
    aria-label="Map"
    @mousemove="onMove"
    @click="moveTo"
  />
</template>
