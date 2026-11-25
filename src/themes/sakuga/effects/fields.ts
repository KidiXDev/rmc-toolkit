import type { FxAttach } from '../../types'
import { lettering } from '../vfx/lettering'
import { burst, lines, puff, shards, slash, ticks } from '../vfx/marks'
import { clamp, random, Spring } from '../vfx/math'
import { scaled } from '../vfx/stage'
import { boxOf, centerOf, combine, listen, observe, part, springLoop } from './dom'

const SLIDER_SCALE = 0.5
const FAST = 0.5
const VERY_FAST = 2
const WORD_PAUSE_MS = 1100

export const attachSlider: FxAttach = (element) => {
  const thumb = part(element, 'thumb')
  if (!thumb) return () => undefined

  const readValue = () => Number(element.style.getPropertyValue('--value')) || 0
  const lag = new Spring(readValue(), 420, 30)
  let peak = 0
  let cloudDebt = 0
  let lastWord = 0

  function rollClouds(velocity: number) {
    const { x, y } = centerOf(thumb ?? element)
    const direction = Math.sign(velocity)
    const back = direction > 0 ? Math.PI : 0
    const force = Math.min(1, Math.abs(velocity) / 2.4)
    cloudDebt = Math.min(3, cloudDebt + Math.abs(velocity) * 0.2)

    scaled(x, y, SLIDER_SCALE, () => {
      for (; cloudDebt > 1; cloudDebt -= 1) {
        puff(x - direction * random(14, 30), y - random(2, 12) - force * 8, {
          size: random(6, 9) + force * 9,
          count: 4,
          vx: -direction * random(26, 70),
          vy: -random(22, 58) * (0.5 + force),
          life: random(0.7, 1.1),
        })
        lines(x - direction * 16, y, {
          count: 1,
          direction: back,
          length: 50 + force * 50,
          spread: 8,
          life: 0.24,
        })
      }
      if (Math.abs(velocity) > VERY_FAST && Date.now() - lastWord > WORD_PAUSE_MS) {
        lastWord = Date.now()
        lettering('shu', x, y - 78, { size: 104, life: 0.75 })
      }
    })
  }

  const loop = springLoop([lag], () => {
    const { value, velocity } = lag
    const stretch = 1 + Math.min(1.5, Math.abs(velocity) * 0.3)
    for (const child of element.children) {
      if (child instanceof HTMLElement) child.style.setProperty('--lag', String(clamp(value)))
    }
    thumb.style.transformOrigin = velocity > 0 ? '100% 50%' : '0 50%'
    thumb.style.transform = `scale(${stretch}, ${1 / Math.sqrt(stretch)})`

    if (Math.abs(velocity) > Math.abs(peak)) peak = velocity
    else peak *= 0.96
    if (Math.abs(velocity) > FAST) rollClouds(velocity)
  })

  function follow() {
    lag.target = readValue()
    loop.wake()
  }

  function letGo() {
    if (Math.abs(peak) > FAST * 2) {
      const { x, y } = centerOf(thumb ?? element)
      const direction = Math.sign(peak)
      const ahead = direction > 0 ? 0 : Math.PI
      scaled(x, y, SLIDER_SCALE, () => {
        slash(x + direction * 34, y, {
          length: 150,
          angle: ahead,
          thickness: 12,
          life: 0.5,
          color: '#b8b3ff',
        })
        burst(x + direction * 4, y, { radius: 24, spikes: 11, life: 0.28 })
        shards(x + direction * 10, y, { count: 4, size: 4, direction: ahead, arc: 2.4 })
      })
    }
    peak = 0
  }

  return combine(
    observe(element, { attributeFilter: ['style'] }, follow),
    listen(element, 'change', letGo),
    loop.stop,
  )
}

function caretOffset(input: HTMLInputElement): number {
  const g = document.createElement('canvas').getContext('2d')
  const style = getComputedStyle(input)
  if (!g) return 0
  g.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  const textWidth = g.measureText(input.value).width
  const isRightAligned = style.textAlign === 'right'
  return isRightAligned ? input.clientWidth - 8 : Math.min(input.clientWidth - 8, 8 + textWidth)
}

export const attachInput: FxAttach = (element) => {
  const bounce = new Spring(1, 700, 16)
  const loop = springLoop([bounce], () => {
    element.style.transform = bounce.value === 1 ? '' : `scale(${bounce.value})`
  })

  function nudge(size: number) {
    bounce.value = size
    loop.wake()
  }

  return combine(
    listen(element, 'focus', () => {
      nudge(1.04)
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
    listen(element, 'input', () => {
      if (!(element instanceof HTMLInputElement)) return
      nudge(0.985)
      const box = boxOf(element)
      const x = box.x + caretOffset(element)
      const y = box.y + box.height * 0.7
      scaled(x, y, 0.7, () => {
        puff(x, y, { size: random(4, 6), count: 2, vy: -22, vx: random(-10, 10), life: 0.4 })
        if (Math.random() < 0.35) shards(x, y, { count: 2, speed: 110, size: 3, life: 0.5 })
      })
    }),
    loop.stop,
  )
}
