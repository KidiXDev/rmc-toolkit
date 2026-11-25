import { useSettings } from '@/stores/settings'

import { SHORTCUTS, type ShortcutDefinition } from './definitions'

export function comboOf(shortcut: ShortcutDefinition): string {
  return useSettings().hotkeys[shortcut.id] ?? shortcut.defaultCombo
}

export function setCombo(shortcut: ShortcutDefinition, combo: string): void {
  const settings = useSettings()
  settings.hotkeys = { ...settings.hotkeys, [shortcut.id]: combo }
}

export function resetCombos(): void {
  useSettings().hotkeys = {}
}

export function findShortcut(combo: string): ShortcutDefinition | undefined {
  return combo === '' ? undefined : SHORTCUTS.find((shortcut) => comboOf(shortcut) === combo)
}

export function conflictOf(shortcut: ShortcutDefinition): ShortcutDefinition | undefined {
  const combo = comboOf(shortcut)
  if (combo === '') return undefined
  return SHORTCUTS.find((other) => other !== shortcut && comboOf(other) === combo)
}
