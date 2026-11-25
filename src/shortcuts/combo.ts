const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta'])

const KEY_ALIASES: Record<string, string> = {
  Esc: 'Escape',
  ' ': 'Space',
  Spacebar: 'Space',
}

function normalizeKey(key: string): string {
  const alias = KEY_ALIASES[key]
  if (alias) return alias
  return key.length === 1 ? key.toUpperCase() : key
}

export function eventToCombo(event: KeyboardEvent): string {
  if (!event.key || event.key === 'Unidentified' || event.key === 'Process') return ''

  const modifiers = [
    event.ctrlKey && 'Control',
    event.altKey && 'Alt',
    event.shiftKey && 'Shift',
    event.metaKey && 'Meta',
  ].filter((modifier) => modifier !== false)

  return MODIFIER_KEYS.has(event.key) ? '' : [...modifiers, normalizeKey(event.key)].join('+')
}

export function comboKey(combo: string): string {
  return combo.endsWith('+') ? '+' : combo.slice(combo.lastIndexOf('+') + 1)
}

export function eventReleasesCombo(event: KeyboardEvent, combo: string): boolean {
  return combo !== '' && normalizeKey(event.key) === comboKey(combo)
}
