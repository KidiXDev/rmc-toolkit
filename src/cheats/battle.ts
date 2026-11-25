import { patchMethod } from '@/engine/patch'
import { isInBattle, rpg } from '@/engine/runtime'
import { useCheats } from '@/stores/cheats'

import { partyMembers } from './party'

export type BattleResult = 'victory' | 'defeat' | 'escape' | 'abort'

export interface EnemySnapshot {
  index: number
  name: string
  hp: number
  maxHp: number
}

function troopMembers() {
  return isInBattle() ? (rpg.$gameTroop?.members() ?? []) : []
}

export function enemySnapshots(): EnemySnapshot[] {
  return troopMembers().map((enemy, index) => ({
    index,
    name: enemy.name(),
    hp: enemy.hp,
    maxHp: enemy.mhp,
  }))
}

export function setEnemyHp(index: number, value: number): void {
  troopMembers()[index]?.setHp(value)
}

export function weakenEnemies(): void {
  for (const enemy of troopMembers()) {
    if (enemy.isAlive()) enemy.setHp(1)
  }
}

export function forceBattleResult(result: BattleResult): boolean {
  const manager = rpg.BattleManager
  if (!manager || !isInBattle()) return false

  switch (result) {
    case 'victory':
      for (const enemy of troopMembers()) enemy.setHp(0)
      manager.processVictory()
      break
    case 'defeat':
      useCheats().godParty = false
      useCheats().godActorIds = []
      for (const actor of partyMembers()) actor.setHp(0)
      manager.processDefeat()
      break
    case 'escape':
      manager._escapeRatio = 1
      manager.processEscape()
      break
    case 'abort':
      manager.abort()
      break
  }
  return true
}

export function installBattle(): void {
  patchMethod(
    rpg.Game_Action?.prototype,
    'evalDamageFormula',
    (original) =>
      function evalDamageFormula(target) {
        const damage = original.call(this, target)
        return damage > 0 && this.subject().isActor()
          ? Math.ceil(damage * useCheats().damageMultiplier)
          : damage
      },
  )
}
