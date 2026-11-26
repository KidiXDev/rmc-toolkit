import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { open } from '@tauri-apps/plugin-dialog'

import type { LiveAction, LiveQuery, LiveReply } from '@/engine/liveProtocol'

export type Engine = 'MV' | 'MZ' | 'VX Ace'
export type CheatStatus = 'notInstalled' | 'current' | 'outdated' | 'standalone' | 'missing'
export type BackupKind = 'manual' | 'beforePlay' | 'beforeRestore'
export type PlayStatus = 'unsorted' | 'planned' | 'playing' | 'finished' | 'dropped'
export type Folder = 'game' | 'saves' | 'backups'

export interface PlaySession {
  game: string
  startedAt: number
  endedAt: number
  playedMs: number
  origin: 'launcher' | 'outside'
}

export interface GameEnded {
  id: string
  playedMs: number
  isEarly: boolean
}

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
  session: PlaySession | null
  arguments: string
  playStatus: PlayStatus
  notes: string
  favorite: boolean
  playMs: number
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

export type DropEvent = { type: 'enter' | 'leave' } | { type: 'drop'; paths: string[] }

export const toolkitVersion = () => invoke<string>('toolkit_version')
export const listGames = () => invoke<GameInfo[]>('list_games')
export const listSessions = () => invoke<PlaySession[]>('list_sessions')
export const stopGame = (id: string) => invoke<null>('stop_game', { id })
export const setNotes = (id: string, notes: string) => invoke<null>('set_notes', { id, notes })

export const setArguments = (id: string, text: string) =>
  invoke<null>('set_arguments', { id, arguments: text })

export const setPlayStatus = (id: string, status: PlayStatus) =>
  invoke<null>('set_play_status', { id, status })

export const setStaysInTray = (stays: boolean) => invoke<null>('set_stays_in_tray', { stays })

export const setDeveloperMode = (enabled: boolean) =>
  invoke<null>('set_developer_mode', { enabled })

export const addGames = (paths: string[]) => invoke<AddResult>('add_games', { paths })
export const findGames = (path: string) => invoke<FoundGame[]>('find_games', { path })
export const removeGame = (id: string) => invoke<null>('remove_game', { id })
export const locateGame = (id: string, path: string) => invoke<null>('locate_game', { id, path })
export const renameGame = (id: string, title: string) => invoke<null>('rename_game', { id, title })
export const installCheats = (id: string) => invoke<null>('install_cheats', { id })
export const gameLog = (id: string) => invoke<string>('game_log', { id })
export const liveGame = (id: string, query: LiveQuery, session?: string, action?: LiveAction) =>
  invoke<LiveReply | null>('live_game', { id, query, session, action })
export const clearLog = (id: string) => invoke<null>('clear_log', { id })
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

export const onGameEnded = (handle: (ended: GameEnded) => void) =>
  listen<GameEnded>('game-ended', ({ payload }) => handle(payload))

export const onPlayFailed = (handle: (reason: string) => void) =>
  listen<string>('play-failed', ({ payload }) => handle(payload))

export const onGameDrop = (handle: (event: DropEvent) => void) =>
  getCurrentWebview().onDragDropEvent(({ payload }) => {
    if (payload.type === 'drop') handle({ type: 'drop', paths: payload.paths })
    else if (payload.type !== 'over') handle({ type: payload.type })
  })
