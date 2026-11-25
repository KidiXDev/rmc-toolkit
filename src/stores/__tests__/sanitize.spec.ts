import { describe, expect, it } from 'vitest'

import { defaultSettings, sanitizeSettings } from '../sanitize'

describe('sanitizeSettings', () => {
  it.each([null, 'text', 4, []])('falls back to defaults for %j', (raw) => {
    expect(sanitizeSettings(raw)).toEqual(defaultSettings())
  })

  it('keeps every extra off unless it was turned on', () => {
    expect(Object.values(defaultSettings().extras)).not.toContain(true)
    expect(sanitizeSettings({ extras: { esp: true, minimap: 'yes' } }).extras).toEqual({
      ...defaultSettings().extras,
      esp: true,
    })
  })

  it('clamps numbers and drops wrong types', () => {
    const settings = sanitizeSettings({ uiScale: 99, badgeOpacity: 'full', windowX: -50 })

    expect(settings.uiScale).toBe(2)
    expect(settings.badgeOpacity).toBe(1)
    expect(settings.windowX).toBe(0)
  })

  it('keeps a known color mode and ignores others', () => {
    expect(sanitizeSettings({ colorMode: 'dark' }).colorMode).toBe('dark')
    expect(sanitizeSettings({ colorMode: 'sepia' }).colorMode).toBe('system')
  })

  it('drops malformed locations and hotkeys', () => {
    const location = { id: 'a', label: 'Home', mapName: 'Town', mapId: 1, x: 2, y: 3 }
    const settings = sanitizeSettings({
      locations: [location, { id: 'b' }, null],
      hotkeys: { noClip: 'F2', quickSave: 5 },
    })

    expect(settings.locations).toEqual([location])
    expect(settings.hotkeys).toEqual({ noClip: 'F2' })
  })
})
