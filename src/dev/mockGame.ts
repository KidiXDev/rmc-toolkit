import { rpg } from '@/engine/runtime'
import type {
  DataItem,
  GameAction,
  GameActor,
  GameBattler,
  GameEvent,
  GameParty,
  GamePlayer,
  GameSystem,
  GameValues,
} from '@/engine/types'

const PARAM_LIMITS = [9999, 9999, 999, 999, 999, 999, 999, 999]
const BASE_PARAMS = [620, 140, 72, 58, 64, 51, 88, 44]
const EXP_PER_LEVEL = 100
const MAP_WIDTH = 24
const MAP_HEIGHT = 18

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

let paramRate = 1

class MockBattler implements GameBattler {
  hp = 1
  mp = 0
  tp = 0
  private readonly bonus = BASE_PARAMS.map(() => 0)

  constructor(
    private readonly label: string,
    private readonly base: number[] = BASE_PARAMS,
  ) {
    this.recoverAll()
  }

  get mhp() {
    return this.param(0)
  }

  get mmp() {
    return this.param(1)
  }

  name() {
    return this.label
  }

  isActor() {
    return false
  }

  isAlive() {
    return this.hp > 0
  }

  maxTp() {
    return 100
  }

  setHp(value: number) {
    this.hp = clamp(value, 0, this.mhp)
  }

  setMp(value: number) {
    this.mp = clamp(value, 0, this.mmp)
  }

  setTp(value: number) {
    this.tp = clamp(value, 0, this.maxTp())
  }

  recoverAll() {
    this.hp = this.mhp
    this.mp = this.mmp
  }

  deathStateId() {
    return 1
  }

  isStateAddable(stateId: number) {
    return stateId > 0
  }

  paySkillCost() {
    this.mp = Math.max(0, this.mp - 10)
  }

  param(paramId: number) {
    const raw = ((this.base[paramId] ?? 0) + (this.bonus[paramId] ?? 0)) * paramRate
    return Math.round(clamp(raw, 1, this.paramMax(paramId)))
  }

  paramMax(paramId: number) {
    return PARAM_LIMITS[paramId] ?? 999
  }

  paramRate() {
    return paramRate
  }

  paramBuffRate() {
    return 1
  }

  addParam(paramId: number, value: number) {
    this.bonus[paramId] = (this.bonus[paramId] ?? 0) + value
  }
}

class MockActor extends MockBattler implements GameActor {
  level = 12
  private exp = this.level * EXP_PER_LEVEL

  constructor(
    private readonly id: number,
    label: string,
  ) {
    super(label)
  }

  override isActor() {
    return true
  }

  actorId() {
    return this.id
  }

  maxLevel() {
    return 99
  }

  currentExp() {
    return this.exp
  }

  finalExpRate() {
    return 1
  }

  changeExp(exp: number) {
    this.exp = exp
    this.level = clamp(Math.floor(exp / EXP_PER_LEVEL), 1, this.maxLevel())
  }

  changeLevel(level: number) {
    this.changeExp(level * EXP_PER_LEVEL)
  }
}

class MockAction implements GameAction {
  constructor(private readonly attacker: GameBattler) {}

  subject() {
    return this.attacker
  }

  evalDamageFormula() {
    return 100
  }
}

class MockPlayer implements GamePlayer {
  x = 12
  y = 9
  _moveSpeed = 4
  _encounterCount = 20

  direction() {
    return 2
  }

  isThrough() {
    return false
  }

  realMoveSpeed() {
    return this._moveSpeed
  }

  canEncounter() {
    return true
  }

  reserveTransfer(_mapId: number, x: number, y: number) {
    this.x = x
    this.y = y
  }
}

class MockValues<K, V> implements GameValues<K, V> {
  private readonly values = new Map<string, V>()

  constructor(private readonly initial: V) {}

  value(key: K) {
    return this.values.get(String(key)) ?? this.initial
  }

  setValue(key: K, value: V) {
    this.values.set(String(key), value)
  }
}

class MockParty implements GameParty {
  private money = 740
  private readonly items = new Map<DataItem, number>()
  private members: GameActor[]
  battle = false

  constructor(private readonly roster: GameActor[]) {
    this.members = roster.slice(0, 3)
  }

  gold() {
    return this.money
  }

  maxGold() {
    return 99_999_999
  }

  gainGold(amount: number) {
    this.money = clamp(this.money + amount, 0, this.maxGold())
  }

  inBattle() {
    return this.battle
  }

  allMembers() {
    return [...this.members]
  }

  addActor(actorId: number) {
    const actor = this.roster.find((entry) => entry.actorId() === actorId)
    if (actor && !this.members.includes(actor)) this.members.push(actor)
  }

  removeActor(actorId: number) {
    this.members = this.members.filter((actor) => actor.actorId() !== actorId)
  }

  numItems(item: DataItem) {
    return this.items.get(item) ?? 0
  }

  maxItems() {
    return 99
  }

  gainItem(item: DataItem, amount: number) {
    this.items.set(item, clamp(this.numItems(item) + amount, 0, this.maxItems()))
  }
}

class MockSystem implements GameSystem {
  onBeforeSave() {}
  onAfterLoad() {}
}

class MockScene {
  readonly isMock = true
}
class MockTitle extends MockScene {}
class MockMapScene extends MockScene {}
class MockBattleScene extends MockScene {}
class MockSaveScene extends MockScene {}
class MockLoadScene extends MockScene {
  reloadMapIfUpdated() {}
}

function mockEvent(id: number, name: string, x: number, y: number, trigger: number): GameEvent {
  return {
    x,
    y,
    _erased: false,
    _pageIndex: 0,
    eventId: () => id,
    event: () => ({ id, name, pages: [{ trigger, list: [] }] }),
    isStarting: () => false,
    screenX: () => x * 48 + 24,
    screenY: () => y * 48 + 48,
    start() {},
    erase() {
      this._erased = true
    },
  }
}

function names(prefix: string, count: number): string[] {
  return Array.from({ length: count + 1 }, (_, id) => (id === 0 ? '' : `${prefix} ${id}`))
}

function dataItems(labels: string[]): Array<DataItem | null> {
  return [
    null,
    ...labels.map((name, index) => ({
      id: index + 1,
      name,
      description: `${name} from the mock game`,
    })),
  ]
}

function isWalkable(x: number, y: number): boolean {
  const insideBorder = x > 0 && y > 0 && x < MAP_WIDTH - 1 && y < MAP_HEIGHT - 1
  return insideBorder && !(x === 8 && y > 3 && y < 14 && y !== 9)
}

const SCENES = { title: MockTitle, map: MockMapScene, battle: MockBattleScene }

function enemyTroop() {
  return [new MockBattler('Slime Regent', [180, 20]), new MockBattler('Clockwork Bat', [90, 10])]
}

function resetGame() {
  paramRate = 1
  const roster = ['Liora', 'Bram', 'Nyx', 'Orin'].map((name, i) => new MockActor(i + 1, name))
  const troop = enemyTroop()
  const events = [
    mockEvent(1, 'Town Guard', 5, 3, 0),
    mockEvent(2, 'Treasure Chest', 12, 7, 0),
    mockEvent(3, 'Door', 9, 1, 1),
    mockEvent(4, 'Patrol', 16, 11, 2),
    mockEvent(5, 'Weather', 3, 12, 4),
  ]

  rpg.$dataSystem = { switches: names('Switch', 140), variables: names('Variable', 60) }
  rpg.$dataActors = [null, ...roster.map((a) => ({ id: a.actorId(), name: a.name() }))]
  rpg.$dataItems = dataItems(['Potion', '--- Tools ---', '------', 'Ether', 'Antidote'])
  rpg.$dataWeapons = dataItems(['Iron Sword', 'Rune Dagger'])
  rpg.$dataArmors = dataItems(['Traveler Coat', 'Mirror Shield'])
  rpg.$dataMapInfos = [
    null,
    { id: 1, name: 'Harbor of Ash', parentId: 0 },
    { id: 2, name: 'Copper Arcade', parentId: 1 },
    { id: 3, name: 'Moonwell Shrine', parentId: 0 },
  ]
  rpg.$gameSystem = new MockSystem()
  rpg.$gameSwitches = new MockValues<number, boolean>(false)
  rpg.$gameVariables = new MockValues<number, unknown>(0)
  rpg.$gameSelfSwitches = new MockValues<[number, number, string], boolean>(false)
  rpg.$gameParty = new MockParty(roster)
  rpg.$gameTroop = { members: () => troop }
  rpg.$gamePlayer = new MockPlayer()
  rpg.$gameTemp = {
    setDestination(x, y) {
      Object.assign(rpg.$gamePlayer ?? {}, { x, y })
    },
  }
  rpg.$gameMap = {
    mapId: () => 1,
    displayName: () => '',
    width: () => MAP_WIDTH,
    height: () => MAP_HEIGHT,
    tileWidth: () => 48,
    tileHeight: () => 48,
    events: () => events,
    isPassable: isWalkable,
  }
  if (rpg.SceneManager) rpg.SceneManager._scene = new MockMapScene()
}

function installClasses() {
  rpg.Game_Actor = MockActor
  rpg.Game_Action = MockAction
  rpg.Game_Player = MockPlayer
  rpg.Scene_Title = MockTitle
  rpg.Scene_Map = MockMapScene
  rpg.Scene_Save = MockSaveScene
  rpg.Scene_Load = MockLoadScene
  rpg.Graphics = { width: 816, height: 624 }
  rpg.SceneManager = {
    _scene: null,
    isSceneChanging: () => false,
    goto(scene) {
      this._scene = new scene()
    },
    push(scene) {
      this._scene = new scene()
    },
    reloadGame() {},
    updateMain() {},
    determineRepeatNumber: (deltaTime) => deltaTime,
  }
  rpg.BattleManager = {
    _escapeRatio: 0,
    processVictory: () => endBattle(),
    processDefeat: () => endBattle(),
    processEscape: () => endBattle(),
    abort: () => endBattle(),
  }
  rpg.DataManager = { saveGame: () => Promise.resolve(0), loadGame: () => true }
}

function setBattle(active: boolean) {
  if (rpg.$gameParty instanceof MockParty) rpg.$gameParty.battle = active
}

function endBattle() {
  setBattle(false)
  showScene('map')
  return true
}

function showScene(name: keyof typeof SCENES) {
  if (rpg.SceneManager) rpg.SceneManager._scene = new SCENES[name]()
}

export function setupMockGame() {
  installClasses()
  resetGame()

  return {
    reset: resetGame,
    showScene,
    startBattle() {
      setBattle(true)
      showScene('battle')
    },
    setParamRate(rate: number) {
      paramRate = rate
    },
    gainExp(actor: GameActor, amount: number) {
      actor.changeExp(actor.currentExp() + Math.round(amount * actor.finalExpRate()), false)
    },
    actionBy(side: 'actor' | 'enemy'): GameAction {
      const [enemy] = enemyTroop()
      const attacker = side === 'actor' ? new MockActor(9, 'Attacker') : enemy
      return new MockAction(attacker ?? new MockBattler('Enemy'))
    },
  }
}
