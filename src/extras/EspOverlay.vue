<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { isOnMap, rpg } from '@/engine/runtime'
import type { GameEvent } from '@/engine/types'

import { eventTrigger, liveEvents } from './mapEvents'
import { triggerColor } from './mapView'
import { useFrame } from './useFrame'

const MARKER_RADIUS = 9
const MAX_LABEL_LENGTH = 16

const canvas = useTemplateRef('canvas')

function gameArea() {
  const gameCanvas = document.querySelector('#gameCanvas, #GameCanvas')
  return gameCanvas?.getBoundingClientRect() ?? document.body.getBoundingClientRect()
}

function alignToGame(element: HTMLCanvasElement, area: DOMRect) {
  if (element.width !== window.innerWidth) element.width = window.innerWidth
  if (element.height !== window.innerHeight) element.height = window.innerHeight
  return area.width / (rpg.Graphics?.width ?? area.width)
}

function drawMarker(g: CanvasRenderingContext2D, event: GameEvent, x: number, y: number) {
  const color = triggerColor(eventTrigger(event))
  g.beginPath()
  g.moveTo(x, y - MARKER_RADIUS)
  g.lineTo(x + MARKER_RADIUS, y)
  g.lineTo(x, y + MARKER_RADIUS)
  g.lineTo(x - MARKER_RADIUS, y)
  g.closePath()
  g.fillStyle = '#ffffff'
  g.fill()
  g.strokeStyle = color
  g.lineWidth = 3
  g.stroke()

  const label = (event.event().name || `Event ${event.eventId()}`).slice(0, MAX_LABEL_LENGTH)
  g.strokeStyle = '#ffffff'
  g.lineWidth = 4
  g.strokeText(label, x, y - MARKER_RADIUS - 6)
  g.fillStyle = '#1d1a4a'
  g.fillText(label, x, y - MARKER_RADIUS - 6)
}

useFrame(() => {
  const g = canvas.value?.getContext('2d')
  if (!canvas.value || !g) return

  const area = gameArea()
  const scale = alignToGame(canvas.value, area)
  g.clearRect(0, 0, canvas.value.width, canvas.value.height)
  if (!isOnMap()) return

  const halfTile = (rpg.$gameMap?.tileHeight() ?? 48) / 2
  g.font = 'bold 11px sans-serif'
  g.textAlign = 'center'
  g.lineJoin = 'round'
  for (const event of liveEvents()) {
    const x = area.left + event.screenX() * scale
    const y = area.top + (event.screenY() - halfTile) * scale
    const isVisible = x > area.left && x < area.right && y > area.top && y < area.bottom
    if (isVisible) drawMarker(g, event, x, y)
  }
})
</script>

<template>
  <canvas ref="canvas" class="pointer-events-none fixed left-0 top-0" aria-hidden="true" />
</template>
