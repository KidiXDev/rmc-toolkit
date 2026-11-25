import { isOnMap, rpg } from '@/engine/runtime'

const MAX_PATH_DEPTH = 20
const KEEP_DIRECTION = 0
const FADE_BLACK = 0

export interface MapEntry {
  id: number
  name: string
}

function mapPath(mapId: number): string {
  const maps = rpg.$dataMapInfos ?? []
  const names: string[] = []
  let map = maps[mapId]

  while (map && names.length < MAX_PATH_DEPTH) {
    names.unshift(map.name)
    map = maps[map.parentId]
  }
  return names.join(' / ')
}

export function mapEntries(): MapEntry[] {
  return (rpg.$dataMapInfos ?? []).flatMap((map) =>
    map ? [{ id: map.id, name: mapPath(map.id) }] : [],
  )
}

export function teleport(mapId: number, x: number, y: number): boolean {
  if (!isOnMap() || !rpg.$gamePlayer) return false
  rpg.$gamePlayer.reserveTransfer(mapId, x, y, KEEP_DIRECTION, FADE_BLACK)
  return true
}

export function walkTo(x: number, y: number): boolean {
  if (!isOnMap() || !rpg.$gameTemp) return false
  rpg.$gameTemp.setDestination(x, y)
  return true
}
