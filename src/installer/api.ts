import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { open } from '@tauri-apps/plugin-dialog'

export type GameStatus = 'notInstalled' | 'current' | 'outdated' | 'missing'

export interface GameInfo {
  path: string
  title: string
  engine: 'MV' | 'MZ' | null
  status: GameStatus
  version: string | null
}

export type DropEvent = { type: 'enter' } | { type: 'leave' } | { type: 'drop'; path: string }

export const toolkitVersion = () => invoke<string>('toolkit_version')
export const inspectGame = (path: string) => invoke<GameInfo>('inspect_game', { path })
export const listGames = () => invoke<GameInfo[]>('list_games')
export const installGame = (path: string) => invoke<GameInfo>('install_game', { path })
export const forgetGame = (path: string) => invoke<null>('forget_game', { path })

export const uninstallGame = (path: string, removeSettings: boolean) =>
  invoke<GameInfo>('uninstall_game', { path, removeSettings })

export function pickFolder(): Promise<string | null> {
  return open({ directory: true, title: 'Choose the game folder' })
}

export function onGameDrop(handle: (event: DropEvent) => void): Promise<() => void> {
  return getCurrentWebview().onDragDropEvent(({ payload }) => {
    if (payload.type === 'enter' || payload.type === 'leave') handle({ type: payload.type })
    if (payload.type !== 'drop') return

    const [path] = payload.paths
    handle(path === undefined ? { type: 'leave' } : { type: 'drop', path })
  })
}
