import type { FxAttach } from '../../types'
import { lettering } from '../vfx/lettering'
import { burst, lines, puff, ring, shards, ticks, wobble } from '../vfx/marks'
import { random, Spring } from '../vfx/math'
import { behind, isCalm, later, scaled } from '../vfx/stage'
import { boxOf, centerOf, combine, observe, springLoop } from './dom'

const LANDING_DISTANCE = 3

export const attachTabs: FxAttach = (element) => {
  const indicator = document.createElement('span')
  indicator.className = 'fx-tab-indicator'
  indicator.setAttribute('aria-hidden', 'true')
  element.prepend(indicator)
  element.dataset.fxIndicator = ''

  const top = new Spring(0, 320, 23)
  const height = new Spring(0, 320, 26)
  let isFlying = false

  const selectedTab = () => element.querySelector<HTMLElement>('[aria-selected="true"]')

  function land() {
    const tab = selectedTab()
    if (!tab) return
    const { x, y, width } = boxOf(tab)
    const center = y + tab.getBoundingClientRect().height / 2
    scaled(x + width, center, 0.55, () => {
      ticks(x + width - 4, center, { direction: 0, radius: 6, length: 15, fan: 0.5, life: 0.5 })
      puff(x + 8, center + 8, { size: 9, count: 4, vx: -20, vy: -12, life: 0.7 })
      later(90, () => puff(x + 2, center + 14, { size: 6, count: 3, vx: -14, life: 0.55 }))
    })
  }

  const loop = springLoop([top, height], () => {
    const stretch = Math.min(24, Math.abs(top.velocity) * 0.04)
    const start = top.velocity > 0 ? top.value - stretch : top.value
    indicator.style.transform = `translateY(${start}px)`
    indicator.style.height = `${height.value + stretch}px`
    if (isFlying && Math.abs(top.value - top.target) < LANDING_DISTANCE) {
      isFlying = false
      land()
    }
  })

  function aim(isInstant: boolean) {
    const tab = selectedTab()
    if (!tab) return
    isFlying = !isInstant && tab.offsetTop !== top.target
    top.target = tab.offsetTop
    height.target = tab.offsetHeight
    if (isInstant || isCalm()) {
      top.value = top.target
      height.value = height.target
      top.velocity = 0
    }
    loop.wake()
  }

  aim(true)

  return combine(
    observe(element, { attributeFilter: ['aria-selected'], subtree: true }, () => aim(false)),
    observe(element, { childList: true }, () => aim(true)),
    loop.stop,
    () => {
      indicator.remove()
      delete element.dataset.fxIndicator
    },
  )
}

export const attachToast: FxAttach = (element) => {
  const slide = new Spring(-280, 280, 18)
  slide.target = 0
  slide.velocity = 1000
  let hasLanded = false

  function land() {
    const { x, y, width, height } = centerOf(element)
    scaled(x - width / 2, y, 0.6, () => {
      lines(x - width / 2 - 4, y, { count: 9, length: 70, spread: 18, life: 0.4 })
      for (const along of [-0.5, -0.36, -0.2]) {
        puff(x + width * along, y + height / 2 + 4, {
          size: random(8, 12),
          count: 4,
          vx: -random(10, 30),
          vy: -8,
          life: random(0.7, 1),
        })
      }
      shards(x - width / 2, y + 12, { count: 4, size: 4, direction: Math.PI + 0.5, arc: 1.6 })
      lettering('zuza', x - width / 2 + 90, y - 62, { size: 124, rotation: -0.1, style: 'dotted' })
    })
    wobble(x + width / 2 + 6, y, { radius: 12 })
  }

  const loop = springLoop([slide], () => {
    const stretch = 1 + Math.min(1.5, Math.abs(slide.velocity) * 0.0017)
    element.style.transform =
      slide.value === 0
        ? ''
        : `translateX(${slide.value}px) scale(${stretch}, ${1 / Math.sqrt(stretch)})`
    if (!hasLanded && slide.value > -10) {
      hasLanded = true
      land()
    }
  })

  if (!isCalm()) loop.wake()

  return combine(loop.stop, () => {
    const { x, y } = centerOf(element)
    puff(x, y, { size: 9, count: 4, life: 0.5 })
  })
}

export const attachTooltip: FxAttach = (element) => {
  const pop = new Spring(0, 460, 15)
  pop.target = 1
  element.style.transformOrigin = '18px 120%'

  const loop = springLoop([pop], () => {
    const size = Math.max(0, pop.value)
    element.style.transform = `scale(${size}) rotate(${(1 - size) * -10}deg)`
  })

  if (!isCalm()) {
    loop.wake()
    later(120, () => {
      if (!element.isConnected) return
      const { x, y, width, height } = centerOf(element)
      const bottom = y + height / 2
      scaled(x - width / 2, bottom, 0.5, () => {
        puff(x - width / 2 - 8, bottom - 12, { size: 8, count: 4, vx: -14, vy: -10 })
        ring(x - width / 2 + 18, bottom + 4, { rx: 22, ry: 5, width: 3 })
        lettering('kachi', x - width / 2 + 60, bottom - height * 2 - 46, {
          size: 96,
          rotation: -0.08,
          life: 0.8,
          style: 'hollow',
        })
      })
    })
  }

  return loop.stop
}

export const attachProgress: FxAttach = (element) => {
  const readValue = () => Number(element.getAttribute('aria-valuenow')) || 0
  let last = readValue()

  function finish() {
    const box = boxOf(element)
    const x = box.x + box.width - 40
    const y = box.y + box.height / 2
    scaled(x, y, 0.7, () => {
      behind(box, () => burst(x, y, { radius: 92, spikes: 15, life: 0.5 }))
      shards(x, y, { count: 11, speed: 270, size: 7, life: 0.9, arc: 6.28 })
      lettering('don', x - 60, y - 70, { size: 170, rotation: -0.12, life: 1.05 })
    })
  }

  function advance() {
    const value = readValue()
    const box = boxOf(element)
    const x = box.x + (box.width * value) / 100
    const y = box.y
    if (value > last) {
      puff(x - 10, y, { size: random(5, 8), count: 3, vx: -random(40, 80) })
      lines(x - 16, y + box.height / 2, { count: 3, length: 50, spread: 10 })
    }
    if (value >= 100 && last < 100) finish()
    last = value
  }

  return observe(element, { attributeFilter: ['aria-valuenow'] }, advance)
}
