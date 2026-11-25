import { rpg } from '@/engine/runtime'

import { eventTrigger, liveEvents } from './mapEvents'
import { currentTerrain } from './terrain'

const TRIGGER_COLORS = ['#3d7bff', '#e89300', '#e8590c', '#1f9d55', '#8f5bff']
const INACTIVE_COLOR = '#9a98b5'
const DIRECTION_ANGLES: Record<number, number> = {
  2: Math.PI / 2,
  4: Math.PI,
  6: 0,
  8: -Math.PI / 2,
}

export interface MapColors {
  blocked: string
  walkable: string
  ink: string
  player: string
}

export interface MapFrame {
  left: number
  top: number
  cell: number
  columns: number
  rows: number
}

export type MapZoom = 'fit' | number

export function triggerColor(trigger: number | null): string {
  return (trigger === null ? undefined : TRIGGER_COLORS[trigger]) ?? INACTIVE_COLOR
}

function followAxis(player: number, tiles: number, cell: number, size: number): number {
  const total = tiles * cell
  if (total <= size) return (size - total) / 2
  const centered = size / 2 - (player + 0.5) * cell
  return Math.min(0, Math.max(size - total, centered))
}

function frameFor(canvas: HTMLCanvasElement, columns: number, rows: number, zoom: MapZoom) {
  const cell = zoom === 'fit' ? Math.min(canvas.width / columns, canvas.height / rows) : zoom
  const player = rpg.$gamePlayer ?? { x: 0, y: 0 }

  return {
    cell,
    columns,
    rows,
    left: followAxis(player.x, columns, cell, canvas.width),
    top: followAxis(player.y, rows, cell, canvas.height),
  }
}

function drawEvents(g: CanvasRenderingContext2D, frame: MapFrame): void {
  const radius = Math.max(1.5, frame.cell * 0.35)
  for (const event of liveEvents()) {
    const x = frame.left + (event.x + 0.5) * frame.cell
    const y = frame.top + (event.y + 0.5) * frame.cell
    g.fillStyle = triggerColor(eventTrigger(event))
    g.beginPath()
    g.arc(x, y, radius, 0, Math.PI * 2)
    g.fill()
  }
}

function drawPlayer(g: CanvasRenderingContext2D, frame: MapFrame, colors: MapColors): void {
  const player = rpg.$gamePlayer
  if (!player) return

  const size = Math.max(4, frame.cell * 0.6)
  g.save()
  g.translate(frame.left + (player.x + 0.5) * frame.cell, frame.top + (player.y + 0.5) * frame.cell)
  g.rotate(DIRECTION_ANGLES[player.direction()] ?? 0)
  g.beginPath()
  g.moveTo(size * 1.1, 0)
  g.lineTo(-size * 0.8, -size * 0.8)
  g.lineTo(-size * 0.35, 0)
  g.lineTo(-size * 0.8, size * 0.8)
  g.closePath()
  g.fillStyle = colors.player
  g.fill()
  g.strokeStyle = colors.ink
  g.lineWidth = 1.5
  g.stroke()
  g.restore()
}

export function drawMap(
  canvas: HTMLCanvasElement,
  zoom: MapZoom,
  colors: MapColors,
): MapFrame | null {
  const g = canvas.getContext('2d')
  if (!g) return null

  g.fillStyle = colors.blocked
  g.fillRect(0, 0, canvas.width, canvas.height)

  const terrain = currentTerrain(colors.walkable)
  if (!terrain) return null

  const frame = frameFor(canvas, terrain.width, terrain.height, zoom)
  g.imageSmoothingEnabled = false
  g.drawImage(
    terrain.canvas,
    frame.left,
    frame.top,
    terrain.width * frame.cell,
    terrain.height * frame.cell,
  )
  drawEvents(g, frame)
  drawPlayer(g, frame, colors)
  return frame
}

export function tileAt(frame: MapFrame, canvasX: number, canvasY: number) {
  const x = Math.floor((canvasX - frame.left) / frame.cell)
  const y = Math.floor((canvasY - frame.top) / frame.cell)
  const isInside = x >= 0 && y >= 0 && x < frame.columns && y < frame.rows
  return isInside ? { x, y } : null
}
