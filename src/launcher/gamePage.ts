import type { GameInfo } from './api'
import type { GameTabId } from './navigation'

export function isLiveReady(game: GameInfo): boolean {
  return game.status === 'current' && game.session !== null
}

export function cheatNeedsAttention(game: GameInfo): boolean {
  return game.status === 'outdated' || !game.isSupported
}

export function defaultGameTab(game: GameInfo, requested?: GameTabId): GameTabId {
  if (requested) return requested
  return isLiveReady(game) ? 'live' : 'overview'
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true
  }
  return target instanceof HTMLElement && Boolean(target.isContentEditable)
}
