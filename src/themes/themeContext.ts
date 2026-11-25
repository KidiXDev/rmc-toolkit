import { inject, ref, type InjectionKey, type Ref } from 'vue'

import type { ShownMode } from './colorMode'

export const POPUP_LAYER: InjectionKey<Readonly<Ref<HTMLElement | null>>> = Symbol('popup layer')
export const SHOWN_MODE: InjectionKey<Readonly<Ref<ShownMode>>> = Symbol('shown mode')

export function usePopupLayer() {
  return inject(POPUP_LAYER, () => ref(null), true)
}

export function useShownMode() {
  return inject(SHOWN_MODE, () => ref<ShownMode>('light'), true)
}
