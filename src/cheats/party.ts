import { patchMethod } from '@/engine/patch'
import { rpg } from '@/engine/runtime'
import type { GameActor } from '@/engine/types'
import { useCheats } from '@/stores/cheats'

export const PARAM_LABELS = [
  'Max HP',
  'Max MP',
  'Attack',
  'Defense',
  'M. Attack',
  'M. Defense',
  'Agility',
  'Luck',
] as const

export interface ActorSnapshot {
  id: number
  name: string
  level: number
  maxLevel: number
  exp: number
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  tp: number
  maxTp: number
  params: number[]
}

export interface RosterEntry {
  id: number
  name: string
  inParty: boolean
}

export function partyMembers(): GameActor[] {
  return rpg.$gameParty?.allMembers() ?? []
}

function isProtected(actor: GameActor): boolean {
  const cheats = useCheats()
  if (!cheats.godParty && !cheats.godActorIds.includes(actor.actorId())) return false
  return partyMembers().includes(actor)
}

function snapshot(actor: GameActor): ActorSnapshot {
  return {
    id: actor.actorId(),
    name: actor.name(),
    level: actor.level,
    maxLevel: actor.maxLevel(),
    exp: actor.currentExp(),
    hp: actor.hp,
    maxHp: actor.mhp,
    mp: actor.mp,
    maxMp: actor.mmp,
    tp: actor.tp,
    maxTp: actor.maxTp(),
    params: PARAM_LABELS.map((_, paramId) => actor.param(paramId)),
  }
}

export function partySnapshots(): ActorSnapshot[] {
  return partyMembers().map(snapshot)
}

export function rosterEntries(): RosterEntry[] {
  const partyIds = new Set(partyMembers().map((actor) => actor.actorId()))

  return (rpg.$dataActors ?? []).flatMap((entry) =>
    entry?.name ? [{ id: entry.id, name: entry.name, inParty: partyIds.has(entry.id) }] : [],
  )
}

function withActor(actorId: number, change: (actor: GameActor) => void): void {
  const actor = partyMembers().find((member) => member.actorId() === actorId)
  if (actor) change(actor)
}

function refill(actor: GameActor): void {
  actor.recoverAll()
  actor.setTp(actor.maxTp())
}

export function setLevel(actorId: number, level: number): void {
  withActor(actorId, (actor) =>
    actor.changeLevel(Math.min(actor.maxLevel(), Math.max(1, level)), false),
  )
}

export function setExp(actorId: number, exp: number): void {
  withActor(actorId, (actor) => actor.changeExp(Math.max(0, exp), false))
}

export function setHp(actorId: number, value: number): void {
  withActor(actorId, (actor) => actor.setHp(value))
}

export function setMp(actorId: number, value: number): void {
  withActor(actorId, (actor) => actor.setMp(value))
}

export function setTp(actorId: number, value: number): void {
  withActor(actorId, (actor) => actor.setTp(value))
}

function changeParam(actor: GameActor, paramId: number, value: number): void {
  const rate = actor.paramRate(paramId) * actor.paramBuffRate(paramId)
  if (rate <= 0) return
  actor.addParam(paramId, Math.round((value - actor.param(paramId)) / rate))
}

export function setParam(actorId: number, paramId: number, value: number): void {
  withActor(actorId, (actor) => changeParam(actor, paramId, value))
}

export function maxParams(actorId: number): void {
  withActor(actorId, (actor) => {
    for (const paramId of PARAM_LABELS.keys()) {
      changeParam(actor, paramId, actor.paramMax(paramId))
    }
    refill(actor)
  })
}

export function maxLevel(actorId: number): void {
  withActor(actorId, (actor) => actor.changeLevel(actor.maxLevel(), false))
}

export function recoverActor(actorId: number): void {
  withActor(actorId, refill)
}

export function recoverParty(): void {
  for (const actor of partyMembers()) refill(actor)
}

export function woundParty(): void {
  for (const actor of partyMembers()) {
    actor.setHp(1)
    actor.setMp(0)
    actor.setTp(0)
  }
}

export function setGodMode(actorId: number, enabled: boolean): void {
  const cheats = useCheats()
  const others = cheats.godActorIds.filter((id) => id !== actorId)
  cheats.godActorIds = enabled ? [...others, actorId] : others
  if (enabled) recoverActor(actorId)
}

export function setPartyGodMode(enabled: boolean): void {
  useCheats().godParty = enabled
  if (enabled) recoverParty()
}

export function addMember(actorId: number): void {
  rpg.$gameParty?.addActor(actorId)
}

export function removeMember(actorId: number): boolean {
  if (partyMembers().length <= 1) return false
  rpg.$gameParty?.removeActor(actorId)
  return true
}

function installGodMode(prototype: GameActor | undefined): void {
  patchMethod(
    prototype,
    'setHp',
    (original) =>
      function (this: GameActor, value) {
        original.call(this, isProtected(this) ? this.mhp : value)
      },
  )

  patchMethod(
    prototype,
    'setMp',
    (original) =>
      function (this: GameActor, value) {
        original.call(this, isProtected(this) ? this.mmp : value)
      },
  )

  patchMethod(
    prototype,
    'setTp',
    (original) =>
      function (this: GameActor, value) {
        original.call(this, isProtected(this) ? this.maxTp() : value)
      },
  )

  patchMethod(
    prototype,
    'isStateAddable',
    (original) =>
      function isStateAddable(this: GameActor, stateId) {
        if (stateId === this.deathStateId() && isProtected(this)) return false
        return original.call(this, stateId)
      },
  )

  patchMethod(
    prototype,
    'paySkillCost',
    (original) =>
      function paySkillCost(this: GameActor, skill) {
        if (!isProtected(this)) original.call(this, skill)
      },
  )
}

export function installParty(): void {
  const prototype = rpg.Game_Actor?.prototype

  installGodMode(prototype)

  patchMethod(
    prototype,
    'finalExpRate',
    (original) =>
      function finalExpRate(this: GameActor) {
        return original.call(this) * useCheats().expMultiplier
      },
  )
}
