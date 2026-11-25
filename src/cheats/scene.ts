import { isCurrentScene, isOnMap, rpg } from '@/engine/runtime'
import type { SceneClass } from '@/engine/types'

function isSuccess(result: boolean | number): boolean {
  return result === true || result === 0
}

function pushFromMap(scene: SceneClass | undefined): boolean {
  if (!scene || !isOnMap()) return false
  rpg.SceneManager?.push(scene)
  return true
}

export function openSaveScene(): boolean {
  return pushFromMap(rpg.Scene_Save)
}

export function openLoadScene(): boolean {
  return pushFromMap(rpg.Scene_Load)
}

export function gotoTitle(): boolean {
  if (!rpg.Scene_Title || isCurrentScene(rpg.Scene_Title)) return false
  rpg.SceneManager?.goto(rpg.Scene_Title)
  return true
}

export function reloadGame(): void {
  if (rpg.SceneManager?.reloadGame) rpg.SceneManager.reloadGame()
  else window.location.reload()
}

export async function quickSave(slot: number): Promise<boolean> {
  if (!isOnMap() || !rpg.DataManager) return false

  rpg.$gameSystem?.setSavefileId?.(slot)
  rpg.$gameSystem?.onBeforeSave()
  return isSuccess(await rpg.DataManager.saveGame(slot))
}

export async function quickLoad(slot: number): Promise<boolean> {
  if (!rpg.DataManager || !rpg.Scene_Map) return false
  if (!isSuccess(await rpg.DataManager.loadGame(slot))) return false

  rpg.Scene_Load?.prototype.reloadMapIfUpdated?.()
  rpg.SceneManager?.goto(rpg.Scene_Map)
  rpg.$gameSystem?.onAfterLoad()
  return true
}

export function openDevTools(): boolean {
  if (rpg.process?.versions?.['nw-flavor'] !== 'sdk' || !rpg.nw) return false
  rpg.nw.Window.get().showDevTools()
  return true
}
