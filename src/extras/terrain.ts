import { rpg } from '@/engine/runtime'
import type { GameMap } from '@/engine/types'

const DIRECTIONS = [2, 4, 6, 8]
const TILES_PER_STEP = 4000

interface Terrain {
  mapId: number
  width: number
  height: number
  canvas: HTMLCanvasElement
  nextTile: number
}

let terrain: Terrain | undefined

function createTerrain(map: GameMap): Terrain {
  const canvas = document.createElement('canvas')
  canvas.width = map.width()
  canvas.height = map.height()
  return {
    mapId: map.mapId(),
    width: canvas.width,
    height: canvas.height,
    canvas,
    nextTile: 0,
  }
}

export function isWalkable(map: GameMap, x: number, y: number): boolean {
  return DIRECTIONS.some((direction) => map.isPassable(x, y, direction))
}

function scanStep(map: GameMap, target: Terrain, color: string): void {
  const g = target.canvas.getContext('2d')
  if (!g) return

  g.fillStyle = color
  const end = Math.min(target.width * target.height, target.nextTile + TILES_PER_STEP)
  for (; target.nextTile < end; target.nextTile += 1) {
    const x = target.nextTile % target.width
    const y = Math.floor(target.nextTile / target.width)
    if (isWalkable(map, x, y)) g.fillRect(x, y, 1, 1)
  }
}

export function currentTerrain(walkableColor: string): Terrain | undefined {
  const map = rpg.$gameMap
  if (!map?.mapId() || !map.width()) return undefined

  if (terrain?.mapId !== map.mapId()) terrain = createTerrain(map)
  scanStep(map, terrain, walkableColor)
  return terrain
}

export function forgetTerrain(): void {
  terrain = undefined
}
