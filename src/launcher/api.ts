import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { open } from '@tauri-apps/plugin-dialog'

export type Engine = 'MV' | 'MZ'
export type CheatStatus = 'notInstalled' | 'current' | 'outdated' | 'missing'
export type BackupKind = 'manual' | 'beforePlay' | 'beforeRestore'
export type Folder = 'game' | 'saves' | 'backups'

export interface GameInfo {
  id: string
  path: string
  title: string
  defaultTitle: string
  engine: Engine | null
  makerVersion: string | null
  isSupported: boolean
  status: CheatStatus
  cheatVersion: string | null
  executable: string | null
  isRunning: boolean
  favorite: boolean
  playSeconds: number
  lastPlayed: number | null
  addedAt: number
  coverKey: string
}

export interface FoundGame {
  path: string
  title: string
  engine: Engine
}

export interface AddResult {
  added: string[]
  failed: string[]
}

export interface Backup {
  id: string
  kind: BackupKind
  createdAt: number
  files: number
  bytes: number
}

export interface CheatError {
  time: string
  version: string
  message: string
}

export type DropEvent = { type: 'enter' | 'leave' } | { type: 'drop'; paths: string[] }

export const toolkitVersion = () => invoke<string>('toolkit_version')
export const listGames = () => invoke<GameInfo[]>('list_games')
export const addGames = (paths: string[]) => invoke<AddResult>('add_games', { paths })
export const findGames = (path: string) => invoke<FoundGame[]>('find_games', { path })
export const removeGame = (id: string) => invoke<null>('remove_game', { id })
export const locateGame = (id: string, path: string) => invoke<null>('locate_game', { id, path })
export const renameGame = (id: string, title: string) => invoke<null>('rename_game', { id, title })
export const installCheats = (id: string) => invoke<null>('install_cheats', { id })
export const cheatErrors = (id: string) => invoke<CheatError[]>('cheat_errors', { id })
export const listBackups = (id: string) => invoke<Backup[]>('list_backups', { id })
export const createBackup = (id: string) => invoke<Backup>('create_backup', { id })

export const setFavorite = (id: string, favorite: boolean) =>
  invoke<null>('set_favorite', { id, favorite })

export const setExecutable = (id: string, path: string | null) =>
  invoke<null>('set_executable', { id, path })

export const setCover = (id: string, path: string | null) => invoke<null>('set_cover', { id, path })

export const uninstallCheats = (id: string, removeSettings: boolean) =>
  invoke<null>('uninstall_cheats', { id, removeSettings })

export const playGame = (id: string, backupFirst: boolean) =>
  invoke<null>('play_game', { id, backupFirst })

export const openFolder = (id: string, folder: Folder) =>
  invoke<null>('open_folder', { id, folder })

export const restoreBackup = (id: string, backup: string) =>
  invoke<null>('restore_backup', { id, backup })

export const deleteBackup = (id: string, backup: string) =>
  invoke<null>('delete_backup', { id, backup })

export async function gameCover(id: string): Promise<string | null> {
  const bytes = await invoke<ArrayBuffer>('game_cover', { id })
  return bytes.byteLength === 0 ? null : URL.createObjectURL(new Blob([bytes]))
}

export const pickFolder = (title: string) => open({ directory: true, title })

export const pickFile = (title: string, name: string, extensions: string[]) =>
  open({ title, filters: [{ name, extensions }] })

export const onLibraryChanged = (handle: () => void) => listen('library-changed', handle)

export const onGameDrop = (handle: (event: DropEvent) => void) =>
  getCurrentWebview().onDragDropEvent(({ payload }) => {
    if (payload.type === 'drop') handle({ type: 'drop', paths: payload.paths })
    else if (payload.type !== 'over') handle({ type: payload.type })
  })
