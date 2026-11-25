import { patchMethod } from '@/engine/patch'
import { rpg } from '@/engine/runtime'
import { useCheats } from '@/stores/cheats'

export const MOVE_SPEED_RANGE = { min: 1, max: 10 }

const DEFAULT_MOVE_SPEED = 4

export function defaultMoveSpeed(): number {
  return rpg.$gamePlayer?._moveSpeed ?? DEFAULT_MOVE_SPEED
}

export function forceEncounter(): void {
  if (rpg.$gamePlayer) rpg.$gamePlayer._encounterCount = 0
}

export function installMovement(): void {
  const player = rpg.Game_Player?.prototype

  patchMethod(
    player,
    'isThrough',
    (original) =>
      function isThrough() {
        return useCheats().noClip || original.call(this)
      },
  )

  patchMethod(
    player,
    'realMoveSpeed',
    (original) =>
      function realMoveSpeed() {
        return useCheats().moveSpeed ?? original.call(this)
      },
  )

  patchMethod(
    player,
    'canEncounter',
    (original) =>
      function canEncounter() {
        return !useCheats().noEncounters && original.call(this)
      },
  )
}
