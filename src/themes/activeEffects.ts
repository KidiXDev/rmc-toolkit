import type { Directive } from 'vue'

import type { FxKind, ThemeEffects } from './types'

let active: ThemeEffects | undefined

const detachers = new WeakMap<HTMLElement, () => void>()

export function setActiveEffects(effects: ThemeEffects | undefined): void {
  active = effects
}

export const vFx: Directive<HTMLElement, undefined, string, FxKind> = {
  mounted(element, { arg }) {
    const detach = arg && active?.attach[arg](element)
    if (detach) detachers.set(element, detach)
  },
  beforeUnmount(element) {
    detachers.get(element)?.()
    detachers.delete(element)
  },
}
