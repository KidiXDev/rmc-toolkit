<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue'

import type { LiveMapCamera, LiveMapPreview } from '@/engine/liveProtocol'
import { useFrame } from '@/extras/useFrame'
import { useDrag } from '@/overlay/useDrag'
import UiButton from '@/ui/UiButton.vue'

const { preview, selectedX, selectedY } = defineProps<{
  preview: LiveMapPreview
  selectedX: number
  selectedY: number
}>()
const emit = defineEmits<{
  camera: [value: LiveMapCamera | null]
  select: [x: number, y: number]
}>()

const CELL = 16
const SNAP_DISTANCE = 8
const KEYBOARD_STEP = 3
const canvas = useTemplateRef('map')
const following = ref(true)
const tiles = new Map<number, string>()
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')

let camera = { x: 0, y: 0 }
let pan = camera
let player = { x: 0, y: 0 }
let requested: LiveMapCamera | null = null
let dirty = true
let lastFrame = 0

function clampOrigin(x: number, y: number) {
  return {
    x: Math.min(preview.width - preview.columns, Math.max(0, x)),
    y: Math.min(preview.height - preview.rows, Math.max(0, y)),
  }
}

function centeredOrigin() {
  return clampOrigin(
    preview.x - Math.floor(preview.columns / 2),
    preview.y - Math.floor(preview.rows / 2),
  )
}

function followPlayer() {
  following.value = true
  requested = null
  emit('camera', null)
}

watch(
  () => preview,
  (next, previous) => {
    if (
      !previous ||
      next.mapId !== previous.mapId ||
      next.width !== previous.width ||
      next.height !== previous.height
    ) {
      tiles.clear()
      camera = centeredOrigin()
      player = { x: next.x, y: next.y }
      followPlayer()
    }
    const { left, top, columns, rows, tiles: cells } = next.terrain
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const value = cells[row * columns + column]
        if (value !== undefined) tiles.set((top + row) * next.width + left + column, value)
      }
    }
    dirty = true
  },
  { immediate: true },
)

watch([() => selectedX, () => selectedY], () => {
  dirty = true
})

function cellSize() {
  return {
    x: (canvas.value?.clientWidth || preview.columns * CELL) / preview.columns,
    y: (canvas.value?.clientHeight || preview.rows * CELL) / preview.rows,
  }
}

function panTo(x: number, y: number) {
  following.value = false
  pan = clampOrigin(x, y)
  const left = Math.floor(pan.x)
  const top = Math.floor(pan.y)
  if (requested && left === requested.left && top === requested.top) return
  requested = { mapId: preview.mapId, left, top }
  emit('camera', requested)
}

const { handlers, isDragging, hasMoved } = useDrag({
  position: () => {
    const scale = cellSize()
    return { x: -camera.x * scale.x, y: -camera.y * scale.y }
  },
  onMove(point) {
    if (!hasMoved.value) return
    const scale = cellSize()
    panTo(-point.x / scale.x, -point.y / scale.y)
  },
})

function selectTile(event: MouseEvent) {
  if (hasMoved.value || !canvas.value) return
  const bounds = canvas.value.getBoundingClientRect()
  const scale = cellSize()
  const offsetX = (event.clientX - bounds.left - canvas.value.clientLeft) / scale.x
  const offsetY = (event.clientY - bounds.top - canvas.value.clientTop) / scale.y
  if (offsetX < 0 || offsetX >= preview.columns || offsetY < 0 || offsetY >= preview.rows) return
  emit('select', Math.floor(camera.x + offsetX), Math.floor(camera.y + offsetY))
}

function panWithKey(event: KeyboardEvent) {
  const target = following.value ? camera : pan
  switch (event.key) {
    case 'ArrowLeft':
      panTo(target.x - KEYBOARD_STEP, target.y)
      break
    case 'ArrowRight':
      panTo(target.x + KEYBOARD_STEP, target.y)
      break
    case 'ArrowUp':
      panTo(target.x, target.y - KEYBOARD_STEP)
      break
    case 'ArrowDown':
      panTo(target.x, target.y + KEYBOARD_STEP)
      break
    case 'Home':
      followPlayer()
      break
    default:
      return
  }
  event.preventDefault()
}

function approach(current: number, target: number, fraction: number): number {
  const distance = target - current
  if (Math.abs(distance) < 0.02 || Math.abs(distance) > SNAP_DISTANCE) return target
  return current + distance * fraction
}

function draw(context: CanvasRenderingContext2D) {
  context.clearRect(0, 0, preview.columns * CELL, preview.rows * CELL)
  for (let row = Math.floor(camera.y); row < Math.ceil(camera.y + preview.rows); row += 1) {
    for (
      let column = Math.floor(camera.x);
      column < Math.ceil(camera.x + preview.columns);
      column += 1
    ) {
      const tile = tiles.get(row * preview.width + column)
      if (tile === undefined) continue
      context.fillStyle = tile === '1' ? '#c1d6b0' : '#364840'
      context.fillRect(
        Math.round((column - camera.x) * CELL),
        Math.round((row - camera.y) * CELL),
        CELL - 1,
        CELL - 1,
      )
    }
  }
  const mark = (x: number, y: number, fill: string) => {
    context.beginPath()
    context.arc((x - camera.x + 0.5) * CELL, (y - camera.y + 0.5) * CELL, 5, 0, Math.PI * 2)
    context.fillStyle = fill
    context.fill()
  }
  mark(selectedX, selectedY, '#e5a83b')
  mark(player.x, player.y, '#377ce0')
}

useFrame((now) => {
  const elapsed = Math.min(now - (lastFrame || now - 16), 50)
  lastFrame = now
  const fraction = reducedMotion?.matches ? 1 : 1 - Math.exp(-elapsed / 55)
  const target = following.value ? centeredOrigin() : pan
  const cameraFraction = isDragging.value ? 1 : fraction
  const nextCamera =
    following.value && isDragging.value
      ? camera
      : {
          x: approach(camera.x, target.x, cameraFraction),
          y: approach(camera.y, target.y, cameraFraction),
        }
  const nextPlayer = {
    x: approach(player.x, preview.x, fraction),
    y: approach(player.y, preview.y, fraction),
  }
  if (
    !dirty &&
    nextCamera.x === camera.x &&
    nextCamera.y === camera.y &&
    nextPlayer.x === player.x &&
    nextPlayer.y === player.y
  )
    return
  camera = nextCamera
  player = nextPlayer
  const context = canvas.value?.getContext('2d')
  if (context) draw(context)
  dirty = false
})
</script>

<template>
  <canvas
    ref="map"
    class="block max-w-full touch-none border-outline border-ink bg-ink focus-visible:border-accent"
    :class="isDragging ? 'cursor-grabbing' : 'cursor-grab'"
    :width="preview.columns * CELL"
    :height="preview.rows * CELL"
    aria-label="Map. Drag or use the arrow keys to pan. Home follows the player."
    tabindex="0"
    v-on="handlers"
    @lostpointercapture="handlers.pointercancel"
    @click="selectTile"
    @keydown="panWithKey"
  />
  <div class="flex flex-wrap items-center gap-2">
    <UiButton :active="following" @click="followPlayer">
      {{ following ? 'Following player' : 'Follow player' }}
    </UiButton>
    <span class="text-dim">Drag to pan. Click a tile to select it.</span>
  </div>
</template>
