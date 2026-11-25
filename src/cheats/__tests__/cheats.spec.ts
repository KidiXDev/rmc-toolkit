import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { setupMockGame } from '@/dev/mockGame'
import { rpg } from '@/engine/runtime'
import { useCheats } from '@/stores/cheats'

import { forceBattleResult } from '../battle'
import { switchEntries } from '../gameData'
import { installCheats } from '../install'
import { inventoryEntries, maxAll } from '../inventory'
import {
  maxParams,
  partyMembers,
  removeMember,
  setGodMode,
  setLevel,
  setParam,
  woundParty,
} from '../party'
import { quickSave } from '../scene'

const game = setupMockGame()
installCheats()

function hero() {
  const [actor] = partyMembers()
  if (!actor) throw new Error('mock party is empty')
  return actor
}

describe('cheats', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    game.reset()
  })

  it('multiplies only gained experience', () => {
    const before = hero().currentExp()
    useCheats().expMultiplier = 3
    game.gainExp(hero(), 10)

    expect(hero().currentExp()).toBe(before + 30)
  })

  it('does not bend level changes with the experience multiplier', () => {
    useCheats().expMultiplier = 5
    setLevel(hero().actorId(), 20)

    expect(hero().level).toBe(20)
  })

  it('multiplies party damage but not enemy damage', () => {
    useCheats().damageMultiplier = 4

    expect(game.actionBy('actor').evalDamageFormula(hero())).toBe(400)
    expect(game.actionBy('enemy').evalDamageFormula(hero())).toBe(100)
  })

  it('protects only the chosen actor', () => {
    const [first, second] = partyMembers()
    if (!first || !second) throw new Error('mock party is too small')
    setGodMode(first.actorId(), true)
    woundParty()

    expect(first.hp).toBe(first.mhp)
    expect(second.hp).toBe(1)
    expect(first.isStateAddable(first.deathStateId())).toBe(false)
    expect(second.isStateAddable(second.deathStateId())).toBe(true)
  })

  it('reaches the requested parameter through rates and buffs', () => {
    game.setParamRate(1.5)
    setParam(hero().actorId(), 2, 300)

    expect(hero().param(2)).toBe(300)
  })

  it('never lowers a parameter when maxing it', () => {
    maxParams(hero().actorId())

    expect(hero().param(0)).toBe(hero().paramMax(0))
    expect(hero().hp).toBe(hero().mhp)
  })

  it('spreads fractional game speed over MZ frames', () => {
    useCheats().gameSpeed = 2.5
    const frames = Array.from({ length: 10 }, () => rpg.SceneManager?.determineRepeatNumber?.(1))

    expect(frames.reduce((total = 0, count = 0) => total + count, 0)).toBe(25)
  })

  it('keeps movement cheats out of the save data', () => {
    const player = rpg.$gamePlayer
    if (!player) throw new Error('mock player is missing')
    const saved = JSON.stringify(player)
    Object.assign(useCheats(), { noClip: true, moveSpeed: 8, noEncounters: true })

    expect(player.isThrough()).toBe(true)
    expect(player.realMoveSpeed()).toBe(8)
    expect(player.canEncounter()).toBe(false)
    expect(JSON.stringify(player)).toBe(saved)
  })

  it('saves only from the map scene', async () => {
    game.showScene('title')
    expect(await quickSave(1)).toBe(false)

    game.showScene('map')
    expect(await quickSave(1)).toBe(true)
  })

  it('forces battle results only during battle', () => {
    expect(forceBattleResult('victory')).toBe(false)

    game.startBattle()
    expect(forceBattleResult('victory')).toBe(true)
  })

  it('keeps at least one party member', () => {
    const removed = partyMembers().map((actor) => removeMember(actor.actorId()))

    expect(removed.pop()).toBe(false)
    expect(partyMembers()).toHaveLength(1)
  })

  it('skips divider items and the unused id zero', () => {
    maxAll('items')

    expect(inventoryEntries('items').every((item) => item.quantity === item.max)).toBe(true)
    expect(inventoryEntries('items').some((item) => item.name.startsWith('---'))).toBe(false)
    expect(switchEntries().some((entry) => entry.id === 0)).toBe(false)
  })
})
