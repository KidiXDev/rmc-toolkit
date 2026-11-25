import { isOnMap, rpg } from '@/engine/runtime'
import type { EventPage, GameEvent } from '@/engine/types'

export const SELF_SWITCHES = ['A', 'B', 'C', 'D'] as const
export type SelfSwitch = (typeof SELF_SWITCHES)[number]

const TRIGGER_LABELS = ['Action', 'Player touch', 'Event touch', 'Autorun', 'Parallel']

export interface MapEventEntry {
  id: number
  name: string
  x: number
  y: number
  trigger: number | null
  triggerLabel: string
  selfSwitches: Record<SelfSwitch, boolean>
}

function mapId(): number {
  return rpg.$gameMap?.mapId() ?? 0
}

function activePage(event: GameEvent): EventPage | undefined {
  return event.event().pages[event._pageIndex]
}

function readSelfSwitch(eventId: number, letter: SelfSwitch): boolean {
  return rpg.$gameSelfSwitches?.value([mapId(), eventId, letter]) ?? false
}

function describe(event: GameEvent): MapEventEntry {
  const id = event.eventId()
  const trigger = activePage(event)?.trigger ?? null

  return {
    id,
    name: event.event().name || `Event ${id}`,
    x: event.x,
    y: event.y,
    trigger,
    triggerLabel: trigger === null ? 'Inactive' : (TRIGGER_LABELS[trigger] ?? 'Unknown'),
    selfSwitches: {
      A: readSelfSwitch(id, 'A'),
      B: readSelfSwitch(id, 'B'),
      C: readSelfSwitch(id, 'C'),
      D: readSelfSwitch(id, 'D'),
    },
  }
}

export function liveEvents(): GameEvent[] {
  if (!mapId()) return []
  return rpg.$gameMap?.events().filter((event) => !event._erased) ?? []
}

export function eventTrigger(event: GameEvent): number | null {
  return activePage(event)?.trigger ?? null
}

export function mapEventEntries(): MapEventEntry[] {
  return liveEvents().map(describe)
}

function findEvent(id: number): GameEvent | undefined {
  return liveEvents().find((event) => event.eventId() === id)
}

export function startEvent(id: number): boolean {
  const event = findEvent(id)
  if (!event || !isOnMap() || !activePage(event)) return false
  event.start()
  return event.isStarting()
}

export function eraseEvent(id: number): void {
  findEvent(id)?.erase()
}

export function setSelfSwitch(id: number, letter: SelfSwitch, value: boolean): void {
  rpg.$gameSelfSwitches?.setValue([mapId(), id, letter], value)
}
