import { Spring } from '../vfx/math'
import { animate, type Box } from '../vfx/stage'

export type Detach = () => void

export function listen<K extends keyof HTMLElementEventMap>(
  element: HTMLElement,
  type: K,
  handler: (event: HTMLElementEventMap[K]) => void,
): Detach {
  element.addEventListener(type, handler)
  return () => element.removeEventListener(type, handler)
}

export function observe(
  element: Element,
  options: MutationObserverInit,
  callback: () => void,
): Detach {
  const observer = new MutationObserver(callback)
  observer.observe(element, options)
  return () => observer.disconnect()
}

export function combine(...detachers: Detach[]): Detach {
  return () => {
    for (const detach of detachers) detach()
  }
}

export function boxOf(element: Element): Box {
  const { left, top, width, height } = element.getBoundingClientRect()
  return { x: left, y: top, width, height }
}

export function centerOf(element: Element) {
  const { x, y, width, height } = boxOf(element)
  return { x: x + width / 2, y: y + height / 2, width, height }
}

export function part(element: HTMLElement, name: string): HTMLElement | null {
  return element.querySelector<HTMLElement>(`[data-fx-part="${name}"]`)
}

export function springLoop(
  springs: Spring[],
  apply: () => void,
): { wake: () => void; stop: () => void } {
  let cancel: Detach | undefined

  function step(seconds: number): boolean {
    for (const spring of springs) spring.step(seconds)
    const isResting = springs.every((spring) => spring.isResting)
    if (isResting) {
      for (const spring of springs) spring.value = spring.target
      cancel = undefined
    }
    apply()
    return !isResting
  }

  return {
    wake() {
      cancel ??= animate(step)
    },
    stop() {
      cancel?.()
      cancel = undefined
    },
  }
}

interface SquashOptions {
  low: number
  wide: number
}

export function squash(element: HTMLElement, { low, wide }: SquashOptions) {
  const press = new Spring(1, 520, 15)
  const pop = new Spring(1, 300, 12)
  const tilt = new Spring(0, 260, 10)

  const loop = springLoop([press, pop, tilt], () => {
    const height = press.value
    const width = (1 + (1 - height) * wide) * pop.value
    const isStill = height === 1 && pop.value === 1 && tilt.value === 0
    element.style.transform = isStill
      ? ''
      : `rotate(${tilt.value}deg) scale(${width}, ${height * pop.value})`
  })

  function aim(target: number) {
    press.target = target
    loop.wake()
  }

  const detach = combine(
    listen(element, 'pointerdown', () => {
      if (!element.matches(':disabled')) aim(low)
    }),
    listen(element, 'pointerup', () => aim(1)),
    listen(element, 'pointerleave', () => aim(1)),
    listen(element, 'pointercancel', () => aim(1)),
    loop.stop,
  )

  return { press, pop, tilt, wake: loop.wake, detach }
}
