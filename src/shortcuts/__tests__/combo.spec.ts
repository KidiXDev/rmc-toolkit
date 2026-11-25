import { describe, expect, it } from 'vitest'

import { comboKey, eventReleasesCombo, eventToCombo } from '../combo'

const press = (key: string, init: KeyboardEventInit = {}) =>
  new KeyboardEvent('keydown', { key, ...init })

describe('eventToCombo', () => {
  it.each([
    [press('c', { ctrlKey: true }), 'Control+C'],
    [press('S', { ctrlKey: true, shiftKey: true }), 'Control+Shift+S'],
    [press(' '), 'Space'],
    [press('`'), '`'],
    [press('Shift', { shiftKey: true }), ''],
    [press('Process'), ''],
  ])('reads a key event', (event, combo) => {
    expect(eventToCombo(event)).toBe(combo)
  })
})

describe('comboKey', () => {
  it.each([
    ['Control+C', 'C'],
    ['F5', 'F5'],
    ['Control++', '+'],
    ['+', '+'],
  ])('finds the main key of %s', (combo, key) => {
    expect(comboKey(combo)).toBe(key)
  })
})

describe('eventReleasesCombo', () => {
  it('matches the main key even after modifiers are let go', () => {
    expect(eventReleasesCombo(press('f'), 'Control+F')).toBe(true)
    expect(eventReleasesCombo(press('Shift'), '`')).toBe(false)
    expect(eventReleasesCombo(press('f'), '')).toBe(false)
  })
})
