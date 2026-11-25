import { enemySnapshots, forceBattleResult, setEnemyHp, weakenEnemies } from '@/cheats/battle'
import {
  isEditableVariable,
  setSwitch,
  setVariable,
  switchEntries,
  variableEntries,
} from '@/cheats/gameData'
import { inventoryEntries, maxAll, setQuantity, type InventoryKind } from '@/cheats/inventory'
import {
  LIVE_SEARCH_LENGTH,
  LIVE_VARIABLE_LENGTH,
  type LiveDetail,
  type LiveMapPreview,
  type LivePage,
} from '@/engine/liveProtocol'
import { isInBattle, isOnMap, rpg } from '@/engine/runtime'
import { teleport, walkTo, mapEntries } from '@/extras/teleport'
import { isWalkable } from '@/extras/terrain'
import { useCheats } from '@/stores/cheats'

const PAGE_SIZE = 24
const PREVIEW_COLUMNS = 23
const PREVIEW_ROWS = 15
const PREVIEW_MARGIN = 8
const MAX_NAME_LENGTH = 160
const MAX_DESCRIPTION_LENGTH = 200
const MAX_MAP_FILE_BYTES = 16 * 1024 * 1024

let battleScene: object | null = null
let battleId = 0

function activeBattleId(): number | null {
  const scene = rpg.SceneManager?._scene
  const phase = rpg.BattleManager?._phase
  if (!scene || !isInBattle() || phase === 'battleEnd' || phase === 'aborting') return null
  if (scene !== battleScene) {
    battleScene = scene
    battleId += 1
  }
  return battleId
}

function isInventoryKind(value: unknown): value is InventoryKind {
  return value === 'items' || value === 'weapons' || value === 'armors'
}

function integerAtLeast(value: unknown, min: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min
}

function editableValue(value: unknown): value is string | number | boolean {
  if (!isEditableVariable(value)) return false
  if (typeof value === 'string') return value.length <= LIVE_VARIABLE_LENGTH
  return typeof value === 'boolean' || Number.isFinite(value)
}

function pageOf<T extends { id: number; name: string }>(
  rows: T[],
  query: Record<string, unknown>,
): LivePage<T> {
  const search =
    typeof query.search === 'string'
      ? query.search.slice(0, LIVE_SEARCH_LENGTH).trim().toLowerCase()
      : ''
  const matches = search
    ? rows.filter((row) => String(row.id) === search || row.name.toLowerCase().includes(search))
    : rows
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE))
  const page = integerAtLeast(query.page, 0) ? Math.min(query.page, pages - 1) : 0
  return {
    rows: matches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((row) => ({
      ...row,
      name: row.name.slice(0, MAX_NAME_LENGTH),
    })),
    page,
    pages,
  }
}

function mapPreview(camera: unknown): LiveMapPreview | null {
  const map = rpg.$gameMap
  const player = rpg.$gamePlayer
  const mapId = map?.mapId()
  if (!map || !player || !mapId) return null

  const width = map.width()
  const height = map.height()
  if (width <= 0 || height <= 0) return null
  const x = Math.floor(player.x)
  const y = Math.floor(player.y)
  const columns = Math.min(PREVIEW_COLUMNS, width)
  const rows = Math.min(PREVIEW_ROWS, height)
  let left = Math.min(width - columns, Math.max(0, x - Math.floor(columns / 2)))
  let top = Math.min(height - rows, Math.max(0, y - Math.floor(rows / 2)))
  if (
    camera &&
    typeof camera === 'object' &&
    'mapId' in camera &&
    camera.mapId === mapId &&
    'left' in camera &&
    integerAtLeast(camera.left, 0) &&
    'top' in camera &&
    integerAtLeast(camera.top, 0)
  ) {
    left = Math.min(width - columns, camera.left)
    top = Math.min(height - rows, camera.top)
  }
  const terrainLeft = Math.max(0, left - PREVIEW_MARGIN)
  const terrainTop = Math.max(0, top - PREVIEW_MARGIN)
  const terrainRight = Math.min(width, left + columns + PREVIEW_MARGIN)
  const terrainBottom = Math.min(height, top + rows + PREVIEW_MARGIN)
  let tiles = ''
  for (let row = terrainTop; row < terrainBottom; row += 1) {
    for (let column = terrainLeft; column < terrainRight; column += 1) {
      tiles += isWalkable(map, column, row) ? '1' : '0'
    }
  }
  return {
    mapId,
    width,
    height,
    x,
    y,
    left,
    top,
    columns,
    rows,
    terrain: {
      left: terrainLeft,
      top: terrainTop,
      columns: terrainRight - terrainLeft,
      rows: terrainBottom - terrainTop,
      tiles,
    },
  }
}

export function liveDetail(query: unknown): LiveDetail | undefined {
  if (!query || typeof query !== 'object' || !('view' in query)) return undefined
  const { view } = query
  if (view === 'map') {
    const preview = mapPreview('camera' in query ? query.camera : null)
    return {
      kind: 'map',
      preview,
      canMove: !!preview && isOnMap(),
      catalog: pageOf(mapEntries(), query),
    }
  }
  if (isInventoryKind(view)) {
    const catalog = pageOf(inventoryEntries(view), query)
    for (const row of catalog.rows)
      row.description = row.description.slice(0, MAX_DESCRIPTION_LENGTH)
    return { kind: 'inventory', group: view, catalog }
  }
  if (view === 'battle') {
    const { expMultiplier, damageMultiplier } = useCheats()
    const id = activeBattleId()
    return {
      kind: 'battle',
      battleId: id,
      enemies: id === null ? [] : enemySnapshots(),
      exp: expMultiplier,
      damage: damageMultiplier,
    }
  }
  if (view === 'switches') return { kind: view, catalog: pageOf(switchEntries(), query) }
  if (view === 'variables') {
    const { rows, ...page } = pageOf(variableEntries(), query)
    return {
      kind: view,
      catalog: {
        ...page,
        rows: rows.map(({ id, name, value }) => ({
          id,
          name,
          value: editableValue(value) ? value : null,
        })),
      },
    }
  }
}

function mapSize(mapId: number): { width: number; height: number } | null {
  const map = rpg.$gameMap
  if (map?.mapId() === mapId) return { width: map.width(), height: map.height() }

  const mainFile = rpg.process?.mainModule?.filename
  if (!mainFile || !rpg.require || !rpg.$dataMapInfos?.[mapId]) return null
  try {
    const fs = rpg.require('fs')
    const path = rpg.require('path')
    const file = path.join(
      path.dirname(mainFile),
      'data',
      `Map${String(mapId).padStart(3, '0')}.json`,
    )
    if (fs.statSync(file).size > MAX_MAP_FILE_BYTES) return null
    const data: unknown = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (!data || typeof data !== 'object' || !('width' in data) || !('height' in data)) return null
    const { width, height } = data
    if (integerAtLeast(width, 1) && integerAtLeast(height, 1)) return { width, height }
  } catch {
    return null
  }
  return null
}

function moveOnMap({ kind, fromMapId, mapId, x, y }: Record<string, unknown>): boolean | string {
  const current = rpg.$gameMap?.mapId()
  if (!isOnMap() || !current || fromMapId !== current) return 'Open the current map before moving.'
  if (!integerAtLeast(mapId, 1) || !integerAtLeast(x, 0) || !integerAtLeast(y, 0)) return false
  if (kind === 'walk' && mapId !== current) return false
  const bounds = mapSize(mapId)
  if (!bounds) return 'The destination map data could not be read.'
  if (x >= bounds.width || y >= bounds.height) {
    return `Choose a tile within the ${bounds.width} × ${bounds.height} destination map.`
  }
  return kind === 'walk' ? walkTo(x, y) : teleport(mapId, x, y)
}

export function applyLiveDetailAction(action: Record<string, unknown>): boolean | string {
  const { kind, group, id, value, index, battleId: requestedBattle, result } = action
  switch (kind) {
    case 'walk':
    case 'teleport':
      return moveOnMap(action)
    case 'quantity': {
      if (!isInventoryKind(group) || !integerAtLeast(id, 1) || !integerAtLeast(value, 0))
        return false
      const item = inventoryEntries(group).find((entry) => entry.id === id)
      if (!item || value > item.max) return false
      setQuantity(group, id, value)
      return true
    }
    case 'maxInventory':
      if (!isInventoryKind(group)) return false
      maxAll(group)
      return true
    case 'enemyHp': {
      if (
        !integerAtLeast(requestedBattle, 1) ||
        requestedBattle !== activeBattleId() ||
        !integerAtLeast(index, 0) ||
        !integerAtLeast(value, 0)
      )
        return false
      const enemy = enemySnapshots()[index]
      if (!enemy || value > enemy.maxHp) return false
      setEnemyHp(index, value)
      return true
    }
    case 'weakenEnemies':
      if (!integerAtLeast(requestedBattle, 1) || requestedBattle !== activeBattleId()) return false
      weakenEnemies()
      return true
    case 'battleResult':
      if (!integerAtLeast(requestedBattle, 1) || requestedBattle !== activeBattleId()) return false
      if (result !== 'victory' && result !== 'defeat' && result !== 'escape' && result !== 'abort')
        return false
      return forceBattleResult(result)
    case 'expMultiplier':
    case 'damageMultiplier':
      if (!integerAtLeast(value, 0) || value > 100) return false
      useCheats()[kind] = value
      return true
    case 'switch':
      if (
        !integerAtLeast(id, 1) ||
        typeof value !== 'boolean' ||
        !rpg.$gameSwitches ||
        id >= (rpg.$dataSystem?.switches?.length ?? 0)
      )
        return false
      setSwitch(id, value)
      return true
    case 'variable':
      if (
        !integerAtLeast(id, 1) ||
        !editableValue(value) ||
        !rpg.$gameVariables ||
        id >= (rpg.$dataSystem?.variables?.length ?? 0) ||
        !editableValue(rpg.$gameVariables.value(id) ?? 0)
      )
        return false
      setVariable(id, value)
      return true
    default:
      return false
  }
}
