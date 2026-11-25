export const EXTRA_IDS = ['teleport', 'locations', 'minimap', 'esp', 'events', 'hud'] as const
export type ExtraId = (typeof EXTRA_IDS)[number]

export const HUD_CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const
export type HudCorner = (typeof HUD_CORNERS)[number]

export interface SavedLocation {
  id: string
  label: string
  mapId: number
  mapName: string
  x: number
  y: number
}

export interface Settings {
  theme: string
  effects: boolean
  uiScale: number
  badge: boolean
  badgeOpacity: number
  windowX: number
  windowY: number
  saveSlot: number
  fastForwardSpeed: number
  extras: Record<ExtraId, boolean>
  hotkeys: Record<string, string>
  locations: SavedLocation[]
  minimapOpacity: number
  minimapTeleport: boolean
  minimapX: number
  minimapY: number
  hudCorner: HudCorner
  hudFps: boolean
  hudMap: boolean
  hudPosition: boolean
}

type NumberKey = {
  [K in keyof Settings]: Settings[K] extends number ? K : never
}[keyof Settings]

export const SETTING_LIMITS = {
  uiScale: [0.75, 2],
  badgeOpacity: [0.2, 1],
  windowX: [0, 10_000],
  windowY: [0, 10_000],
  saveSlot: [1, 99],
  fastForwardSpeed: [2, 10],
  minimapOpacity: [0.3, 1],
  minimapX: [0, 10_000],
  minimapY: [0, 10_000],
} as const satisfies Record<NumberKey, readonly [number, number]>

export function defaultSettings(): Settings {
  return {
    theme: 'sakuga',
    effects: true,
    uiScale: 1,
    badge: true,
    badgeOpacity: 1,
    windowX: 24,
    windowY: 24,
    saveSlot: 1,
    fastForwardSpeed: 6,
    extras: {
      teleport: false,
      locations: false,
      minimap: false,
      esp: false,
      events: false,
      hud: false,
    },
    hotkeys: {},
    locations: [],
    minimapOpacity: 0.9,
    minimapTeleport: true,
    minimapX: 24,
    minimapY: 96,
    hudCorner: 'top-left',
    hudFps: true,
    hudMap: true,
    hudPosition: true,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readNumber(raw: Record<string, unknown>, key: NumberKey, fallback: number): number {
  const value = raw[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const [min, max] = SETTING_LIMITS[key]
  return Math.min(max, Math.max(min, value))
}

function readBoolean(raw: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = raw[key]
  return typeof value === 'boolean' ? value : fallback
}

function readExtras(raw: unknown): Record<ExtraId, boolean> {
  const extras = defaultSettings().extras
  if (!isRecord(raw)) return extras
  for (const id of EXTRA_IDS) extras[id] = readBoolean(raw, id, false)
  return extras
}

function readHotkeys(raw: unknown): Record<string, string> {
  if (!isRecord(raw)) return {}
  const hotkeys: Record<string, string> = {}
  for (const [id, combo] of Object.entries(raw)) {
    if (typeof combo === 'string') hotkeys[id] = combo
  }
  return hotkeys
}

function isSavedLocation(value: unknown): value is SavedLocation {
  return (
    isRecord(value) &&
    ['id', 'label', 'mapName'].every((key) => typeof value[key] === 'string') &&
    ['mapId', 'x', 'y'].every((key) => Number.isInteger(value[key]))
  )
}

export function sanitizeSettings(raw: unknown): Settings {
  const settings = defaultSettings()
  if (!isRecord(raw)) return settings

  const number = (key: NumberKey) => readNumber(raw, key, settings[key])
  const corner = HUD_CORNERS.find((value) => value === raw.hudCorner)

  return {
    theme: typeof raw.theme === 'string' ? raw.theme : settings.theme,
    effects: readBoolean(raw, 'effects', settings.effects),
    uiScale: number('uiScale'),
    badge: readBoolean(raw, 'badge', settings.badge),
    badgeOpacity: number('badgeOpacity'),
    windowX: number('windowX'),
    windowY: number('windowY'),
    saveSlot: Math.round(number('saveSlot')),
    fastForwardSpeed: number('fastForwardSpeed'),
    extras: readExtras(raw.extras),
    hotkeys: readHotkeys(raw.hotkeys),
    locations: Array.isArray(raw.locations) ? raw.locations.filter(isSavedLocation) : [],
    minimapOpacity: number('minimapOpacity'),
    minimapTeleport: readBoolean(raw, 'minimapTeleport', settings.minimapTeleport),
    minimapX: number('minimapX'),
    minimapY: number('minimapY'),
    hudCorner: corner ?? settings.hudCorner,
    hudFps: readBoolean(raw, 'hudFps', settings.hudFps),
    hudMap: readBoolean(raw, 'hudMap', settings.hudMap),
    hudPosition: readBoolean(raw, 'hudPosition', settings.hudPosition),
  }
}
