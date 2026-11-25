import { currentMapLabel, rpg } from '@/engine/runtime'
import type { SavedLocation } from '@/stores/sanitize'
import { useSettings } from '@/stores/settings'

import { teleport } from './teleport'

export function saveCurrentLocation(label: string): boolean {
  const mapId = rpg.$gameMap?.mapId()
  const player = rpg.$gamePlayer
  if (!mapId || !player) return false

  const settings = useSettings()
  const mapName = currentMapLabel()
  const location: SavedLocation = {
    id: `${Date.now()}-${settings.locations.length}`,
    label: label.trim() || `${mapName} (${player.x}, ${player.y})`,
    mapId,
    mapName,
    x: player.x,
    y: player.y,
  }
  settings.locations = [...settings.locations, location]
  return true
}

export function deleteLocation(id: string): void {
  const settings = useSettings()
  settings.locations = settings.locations.filter((location) => location.id !== id)
}

export function goToLocation({ mapId, x, y }: SavedLocation): boolean {
  return teleport(mapId, x, y)
}
