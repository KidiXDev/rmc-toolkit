import { SAKUGA_EFFECTS } from './sakuga/effects'
import type { Theme } from './types'

const SAKUGA: Theme = { id: 'sakuga', label: 'Sakuga', effects: SAKUGA_EFFECTS }

export const THEMES: Theme[] = [SAKUGA]

export function themeById(id: string): Theme {
  return THEMES.find((theme) => theme.id === id) ?? SAKUGA
}
