import type { FxAttach } from '../../types'
import { lettering } from '../vfx/lettering'
import { burst, donut, puff, shards, ticks, wobble } from '../vfx/marks'
import { random } from '../vfx/math'
import { behind, later, scaled } from '../vfx/stage'
import { boxOf, centerOf, combine, listen, squash } from './dom'

const ACTION_SCALE = 0.55
const IMPACT_MS = 190
const UP = -Math.PI / 2

const CLOUD_DIRECTIONS = [
  [-1, -0.5],
  [1, -1],
  [-1, 0.9],
  [1, 1],
] as const

export const attachButton: FxAttach = (element) => {
  const { press, wake, detach } = squash(element, { low: 0.72, wide: 0.3 })

  return combine(
    detach,
    listen(element, 'click', () => {
      press.value = Math.min(press.value, 0.8)
      press.velocity += 4
      wake()

      const { x, y, width } = boxOf(element)
      scaled(x + width, y, 0.6, () =>
        ticks(x + width - 6, y - 4, {
          direction: -1.05,
          radius: 5,
          length: 17,
          fan: 0.36,
          life: 0.5,
        }),
      )
    }),
  )
}

export const attachAction: FxAttach = (element) => {
  const { press, pop, tilt, wake, detach } = squash(element, { low: 0.5, wide: 0.24 })
  let latest = 0
  let restBox = boxOf(element)

  function aftermath(id: number) {
    if (id !== latest || !element.isConnected) return
    press.value = 1.22
    wake()
    const { x, y } = centerOf(element)
    wobble(x - 78, y, { direction: -1 })
    wobble(x + 78, y, { direction: 1 })
    donut(x + 6, y - 44, { radius: 30, vx: 22, vy: -52, life: 1.25 })
    later(90, () => donut(x + 54, y - 50, { radius: 18, vx: 34, vy: -40, life: 1.1 }))
    later(170, () => donut(x + 86, y - 46, { radius: 10, vx: 40, vy: -30 }))
  }

  function impact() {
    latest += 1
    const current = latest
    const { x, y } = centerOf(element)

    press.value = Math.min(press.value, 0.6)
    pop.value = 1.24
    tilt.value = -5
    wake()
    element.classList.add('fx-impact')

    scaled(x, y, ACTION_SCALE, () => {
      later(IMPACT_MS, () => element.classList.remove('fx-impact'))
      behind(restBox, () => burst(x, y, { radius: 98, spikes: 17, life: 0.48 }))
      shards(x, y, { count: 11, speed: 260, size: 9, life: 0.95, arc: 6.28, gravity: 300 })
      for (const [dx, dy] of CLOUD_DIRECTIONS) {
        puff(x + dx * 76, y + dy * 26, {
          size: random(12, 16),
          vx: dx * 46,
          vy: dy * 30 - 6,
          life: random(0.75, 1.05),
        })
      }
      lettering('don', x + 10, y - 84, { size: 176, rotation: -0.12, life: 1.05 })
      ticks(x - 96, y - 70, { direction: -2.4, count: 2, radius: 4, length: 22, life: 0.45 })
      ticks(x + 110, y - 60, { direction: -0.7, count: 2, radius: 4, length: 22, life: 0.45 })
      later(200, () => aftermath(current))
    })
  }

  return combine(
    detach,
    listen(element, 'pointerdown', () => {
      if (element.matches(':disabled')) return
      restBox = boxOf(element)
      const { x, y, height } = centerOf(element)
      scaled(x, y, ACTION_SCALE, () =>
        ticks(x, y - height - 6, { direction: UP, radius: 4, length: 14, fan: 0.5 }),
      )
    }),
    listen(element, 'click', impact),
    () => element.classList.remove('fx-impact'),
  )
}
