import { patchMethod } from '@/engine/patch'
import { isInBattle, rpg } from '@/engine/runtime'
import { useCheats } from '@/stores/cheats'
import { useSettings } from '@/stores/settings'

const FRAME_SECONDS = 1 / 60

export const SPEED_RANGE = { min: 0.1, max: 10 }

export function currentGameSpeed(): number {
  const cheats = useCheats()
  const base = isInBattle() ? cheats.battleSpeed : cheats.gameSpeed
  return cheats.fastForward ? Math.max(base, useSettings().fastForwardSpeed) : base
}

function installMvSpeed(): void {
  patchMethod(
    rpg.SceneManager,
    'updateMain',
    (original) =>
      function updateMain() {
        this._deltaTime = FRAME_SECONDS / currentGameSpeed()
        original.call(this)
      },
  )
}

function installMzSpeed(): void {
  let remainder = 0

  patchMethod(
    rpg.SceneManager,
    'determineRepeatNumber',
    (original) =>
      function determineRepeatNumber(deltaTime) {
        const frames = original.call(this, deltaTime)
        const speed = currentGameSpeed()
        if (speed === 1) return frames

        const scaled = frames * speed + remainder
        const whole = Math.floor(scaled)
        remainder = scaled - whole
        return whole
      },
  )
}

export function installSpeed(): void {
  if (rpg.SceneManager?.determineRepeatNumber) installMzSpeed()
  else installMvSpeed()

  patchMethod(
    rpg.Window_Message?.prototype,
    'isTriggered',
    (original) =>
      function isTriggered() {
        return useCheats().fastForward || original.call(this)
      },
  )
}

export function setFastForward(active: boolean): void {
  useCheats().fastForward = active
}
