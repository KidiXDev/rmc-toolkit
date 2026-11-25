import type { FxAttach } from '../../types'
import { lettering } from '../vfx/lettering'
import { lines, puff, shards, slash, sparkle } from '../vfx/marks'
import { Spring, times } from '../vfx/math'
import { animate, isCalm, later, scaled } from '../vfx/stage'
import { centerOf, combine, observe, part, springLoop, type Detach } from './dom'
import toggleSheetUrl from './toggle-frames.webp?inline'

const FRAME = { count: 43, perSecond: 30, width: 300, height: 325, columns: 8 }
const PIXELS = { width: 100, height: 108 }
const ON_FRAMES = times(FRAME.count, (index) => index)
const OFF_FRAMES = times(12, (index) => 11 - index)

let sheet: HTMLImageElement | undefined

function toggleSheet(): HTMLImageElement {
  if (!sheet) {
    sheet = new Image()
    sheet.src = toggleSheetUrl
  }
  return sheet
}

function isChecked(element: HTMLElement): boolean {
  return element.getAttribute('aria-checked') === 'true'
}

export const attachToggle: FxAttach = (element) => {
  const image = toggleSheet()
  const visual = part(element, 'switch')
  const canvas = document.createElement('canvas')
  canvas.width = PIXELS.width
  canvas.height = PIXELS.height
  canvas.className = 'fx-toggle-art'
  element.append(canvas)

  let cancel: Detach | undefined

  function draw(frame: number) {
    const g = canvas.getContext('2d')
    if (!g || !image.naturalWidth) return
    const sourceX = (frame % FRAME.columns) * FRAME.width
    const sourceY = Math.floor(frame / FRAME.columns) * FRAME.height
    g.clearRect(0, 0, PIXELS.width, PIXELS.height)
    g.drawImage(
      image,
      sourceX,
      sourceY,
      FRAME.width,
      FRAME.height,
      0,
      0,
      PIXELS.width,
      PIXELS.height,
    )
  }

  function rest() {
    if (visual) visual.style.visibility = 'hidden'
    draw(isChecked(element) ? FRAME.count - 1 : 0)
  }

  function play() {
    cancel?.()
    if (isCalm()) {
      rest()
      return
    }
    const frames = isChecked(element) ? ON_FRAMES : OFF_FRAMES
    let elapsed = 0
    cancel = animate((seconds) => {
      elapsed += seconds
      const index = Math.min(frames.length - 1, Math.floor(elapsed * FRAME.perSecond))
      draw(frames[index] ?? 0)
      return index < frames.length - 1
    })
  }

  if (image.naturalWidth) rest()
  else image.addEventListener('load', rest, { once: true })

  return combine(observe(element, { attributeFilter: ['aria-checked'] }, play), () => {
    cancel?.()
    image.removeEventListener('load', rest)
    canvas.remove()
    if (visual) visual.style.visibility = ''
  })
}

export const attachCheckbox: FxAttach = (element) => {
  const box = part(element, 'box') ?? element
  const bounce = new Spring(1, 600, 13)
  const loop = springLoop([bounce], () => {
    const size = bounce.value
    box.style.transform = size === 1 ? '' : `scale(${size}) rotate(${(1 - size) * 20}deg)`
  })

  function react() {
    bounce.value = 0.68
    loop.wake()
    const { x, y } = centerOf(box)

    scaled(x, y, 0.5, () => {
      if (!isChecked(element)) {
        puff(x, y, { size: 7, count: 3, life: 0.4 })
        return
      }
      slash(x + 8, y + 2, { length: 150, angle: -0.42, thickness: 13, life: 0.5 })
      slash(x - 6, y + 12, { length: 110, angle: 2.72, thickness: 7, life: 0.55 })
      lines(x - 34, y + 26, { count: 6, direction: 2.75, length: 60, spread: 14 })
      shards(x, y, { count: 6, size: 6, arc: 6.28, gravity: 260 })
      later(380, () => sparkle(x + 24, y - 22))
      lettering('zuza', x + 30, y - 62, { size: 112, rotation: -0.12, style: 'dotted' })
    })
  }

  return combine(observe(element, { attributeFilter: ['aria-checked'] }, react), loop.stop)
}
