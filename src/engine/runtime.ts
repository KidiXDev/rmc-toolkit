import type { RpgGlobals, SceneClass } from './types'

export const rpg = window as Window & Partial<RpgGlobals>

export function isGameReady(): boolean {
  return Boolean(rpg.$dataSystem && rpg.$gameParty && rpg.$gamePlayer && rpg.SceneManager)
}

export function isDeveloperMode(): boolean {
  return rpg.process?.env?.RMC_DEVELOPER_MODE === '1'
}

export function isInBattle(): boolean {
  return rpg.$gameParty?.inBattle() ?? false
}

export function isCurrentScene(scene: SceneClass | undefined): boolean {
  const current = rpg.SceneManager?._scene
  return Boolean(scene && current instanceof scene)
}

export function isOnMap(): boolean {
  return isCurrentScene(rpg.Scene_Map) && !rpg.SceneManager?.isSceneChanging()
}

export function currentMapLabel(): string {
  const map = rpg.$gameMap
  if (!map?.mapId()) return 'No map'
  const id = map.mapId()
  return map.displayName() || rpg.$dataMapInfos?.[id]?.name || `Map ${id}`
}
