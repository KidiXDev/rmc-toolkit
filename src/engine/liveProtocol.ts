import type { BattleResult, EnemySnapshot } from '@/cheats/battle'
import type { SwitchEntry, VariableEntry } from '@/cheats/gameData'
import type { InventoryEntry, InventoryKind } from '@/cheats/inventory'
import type { ActorSnapshot } from '@/cheats/party'
import type { MapEntry } from '@/extras/teleport'

export const LIVE_SEARCH_LENGTH = 64
export const LIVE_VARIABLE_LENGTH = 160

export type LiveView = 'player' | 'map' | 'battle' | InventoryKind | 'switches' | 'variables'

export interface LiveQuery {
  view: LiveView
  search: string
  page: number
  camera?: LiveMapCamera | null
}

export interface LiveMapCamera {
  mapId: number
  left: number
  top: number
}

export interface LivePage<T> {
  rows: T[]
  page: number
  pages: number
}

export interface LiveMapPreview {
  mapId: number
  width: number
  height: number
  x: number
  y: number
  left: number
  top: number
  columns: number
  rows: number
  terrain: {
    left: number
    top: number
    columns: number
    rows: number
    tiles: string
  }
}

export type LiveVariable = Omit<VariableEntry, 'value'> & {
  value: string | number | boolean | null
}

export type LiveDetail =
  | { kind: 'map'; canMove: boolean; preview: LiveMapPreview | null; catalog: LivePage<MapEntry> }
  | { kind: 'inventory'; group: InventoryKind; catalog: LivePage<InventoryEntry> }
  | {
      kind: 'battle'
      battleId: number | null
      enemies: EnemySnapshot[]
      exp: number
      damage: number
    }
  | { kind: 'switches'; catalog: LivePage<SwitchEntry> }
  | { kind: 'variables'; catalog: LivePage<LiveVariable> }

export type LiveAction =
  | { kind: 'gold' | 'gameSpeed' | 'battleSpeed'; value: number }
  | { kind: 'noClip' | 'noEncounters' | 'godParty'; value: boolean }
  | { kind: 'hp' | 'mp'; actorId: number; value: number }
  | { kind: 'recoverParty' }
  | { kind: 'walk' | 'teleport'; fromMapId: number; mapId: number; x: number; y: number }
  | { kind: 'quantity'; group: InventoryKind; id: number; value: number }
  | { kind: 'maxInventory'; group: InventoryKind }
  | { kind: 'enemyHp'; battleId: number; index: number; value: number }
  | { kind: 'weakenEnemies'; battleId: number }
  | { kind: 'battleResult'; battleId: number; result: BattleResult }
  | { kind: 'expMultiplier' | 'damageMultiplier'; value: number }
  | { kind: 'switch'; id: number; value: boolean }
  | { kind: 'variable'; id: number; value: string | number | boolean }

export interface LiveGameState {
  session: string
  map: string
  inBattle: boolean
  gold: number
  maxGold: number
  party: Pick<ActorSnapshot, 'id' | 'name' | 'level' | 'hp' | 'maxHp' | 'mp' | 'maxMp'>[]
  gameSpeed: number
  battleSpeed: number
  noClip: boolean
  noEncounters: boolean
  godParty: boolean
}

export type LiveReply =
  | { status: 'live'; state: LiveGameState; detail?: LiveDetail }
  | { status: 'waiting' }
  | { status: 'error'; message: string }
