export interface DataEntry {
  id: number
  name: string
}

export interface DataItem extends DataEntry {
  description?: string
}

export interface DataMapInfo extends DataEntry {
  parentId: number
}

export interface DataSystem {
  switches: Array<string | null>
  variables: Array<string | null>
}

export interface GameBattler {
  hp: number
  mp: number
  tp: number
  mhp: number
  mmp: number
  name(): string
  isActor(): boolean
  isAlive(): boolean
  maxTp(): number
  setHp(value: number): void
  setMp(value: number): void
  setTp(value: number): void
  recoverAll(): void
  deathStateId(): number
  isStateAddable(stateId: number): boolean
  paySkillCost(skill: unknown): void
  param(paramId: number): number
  paramMax(paramId: number): number
  paramRate(paramId: number): number
  paramBuffRate(paramId: number): number
  addParam(paramId: number, value: number): void
}

export interface GameActor extends GameBattler {
  level: number
  actorId(): number
  maxLevel(): number
  currentExp(): number
  finalExpRate(): number
  changeExp(exp: number, show: boolean): void
  changeLevel(level: number, show: boolean): void
}

export interface GameAction {
  subject(): GameBattler
  evalDamageFormula(target: GameBattler): number
}

export interface GameParty {
  gold(): number
  maxGold(): number
  gainGold(amount: number): void
  inBattle(): boolean
  allMembers(): GameActor[]
  addActor(actorId: number): void
  removeActor(actorId: number): void
  numItems(item: DataItem): number
  maxItems(item: DataItem): number
  gainItem(item: DataItem, amount: number, includeEquip: boolean): void
}

export interface GameTroop {
  members(): GameBattler[]
}

export interface GamePlayer {
  x: number
  y: number
  _moveSpeed: number
  _encounterCount: number
  direction(): number
  isThrough(): boolean
  realMoveSpeed(): number
  canEncounter(): boolean
  reserveTransfer(mapId: number, x: number, y: number, direction: number, fadeType: number): void
}

export interface EventPage {
  trigger: number
  list: unknown[]
}

export interface GameEvent {
  x: number
  y: number
  _erased: boolean
  _pageIndex: number
  eventId(): number
  event(): DataEntry & { pages: EventPage[] }
  isStarting(): boolean
  screenX(): number
  screenY(): number
  start(): void
  erase(): void
}

export interface GameMap {
  mapId(): number
  displayName(): string
  width(): number
  height(): number
  tileWidth(): number
  tileHeight(): number
  events(): GameEvent[]
  isPassable(x: number, y: number, direction: number): boolean
}

export type SelfSwitchKey = [mapId: number, eventId: number, letter: string]

export interface GameValues<K, V> {
  value(key: K): V
  setValue(key: K, value: V): void
}

export interface GameSystem {
  setSavefileId?(savefileId: number): void
  onBeforeSave(): void
  onAfterLoad(): void
}

export type SceneClass = new () => object

export interface SceneManagerClass {
  _scene: object | null
  _deltaTime?: number
  isSceneChanging(): boolean
  goto(scene: SceneClass): void
  push(scene: SceneClass): void
  reloadGame?(): void
  updateMain(): void
  determineRepeatNumber?(deltaTime: number): number
}

export interface BattleManagerClass {
  _escapeRatio: number
  processVictory(): void
  processDefeat(): void
  processEscape(): boolean
  abort(): void
}

export interface DataManagerClass {
  saveGame(savefileId: number): boolean | Promise<number>
  loadGame(savefileId: number): boolean | Promise<number>
}

interface WithPrototype<T> {
  prototype: T
}

interface FileSystem {
  existsSync(path: string): boolean
  mkdirSync(path: string): void
  readFileSync(path: string, encoding: 'utf8'): string
  writeFileSync(path: string, content: string, encoding: 'utf8'): void
  renameSync(from: string, to: string): void
}

interface PathModule {
  dirname(path: string): string
  join(...parts: string[]): string
}

export interface NodeModules {
  fs: FileSystem
  path: PathModule
}

export interface RpgGlobals {
  $dataSystem: DataSystem | null
  $dataActors: Array<DataEntry | null> | null
  $dataItems: Array<DataItem | null> | null
  $dataWeapons: Array<DataItem | null> | null
  $dataArmors: Array<DataItem | null> | null
  $dataMapInfos: Array<DataMapInfo | null> | null
  $gameTemp: { setDestination(x: number, y: number): void } | null
  $gameSystem: GameSystem | null
  $gameSwitches: GameValues<number, boolean> | null
  $gameVariables: GameValues<number, unknown> | null
  $gameSelfSwitches: GameValues<SelfSwitchKey, boolean> | null
  $gameParty: GameParty | null
  $gameTroop: GameTroop | null
  $gameMap: GameMap | null
  $gamePlayer: GamePlayer | null
  SceneManager: SceneManagerClass
  BattleManager: BattleManagerClass
  DataManager: DataManagerClass
  Graphics: { width: number; height: number }
  Scene_Title: SceneClass
  Scene_Map: SceneClass
  Scene_Save: SceneClass
  Scene_Load: SceneClass & WithPrototype<{ reloadMapIfUpdated?(): void }>
  Game_Actor: WithPrototype<GameActor>
  Game_Action: WithPrototype<GameAction>
  Game_Player: WithPrototype<GamePlayer>
  Window_Message: WithPrototype<{ isTriggered(): boolean }>
  require: <K extends keyof NodeModules>(name: K) => NodeModules[K]
  process: { mainModule?: { filename: string }; versions?: Record<string, string | undefined> }
  nw: { Window: { get(): { showDevTools(): void } } }
}
