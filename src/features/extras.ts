import type { ExtraId } from '@/stores/sanitize'

export const EXTRAS: Record<ExtraId, { label: string; hint: string }> = {
  teleport: { label: 'Teleport', hint: 'Jump to any map and tile.' },
  locations: { label: 'Saved places', hint: 'Remember spots and return to them.' },
  minimap: { label: 'Minimap', hint: 'Floating map with click to move.' },
  esp: { label: 'Event markers', hint: 'Show events on the game screen.' },
  events: { label: 'Map events', hint: 'Start or erase events and edit self switches.' },
  hud: { label: 'HUD', hint: 'FPS, map and position in a corner.' },
}
