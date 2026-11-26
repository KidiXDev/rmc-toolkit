import type { GameInfo, PlayStatus } from './api'

export const FILTERS = ['all', 'favorites', 'installed', 'updates'] as const
export type Filter = (typeof FILTERS)[number]

export const SORTS = ['recent', 'title', 'playtime', 'added'] as const
export type Sort = (typeof SORTS)[number]

export const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  favorites: 'Favorites',
  installed: 'With cheats',
  updates: 'Needs update',
}

export const SORT_LABELS: Record<Sort, string> = {
  recent: 'Last played',
  title: 'Title',
  playtime: 'Playtime',
  added: 'Date added',
}

export const PLAY_STATUSES = ['unsorted', 'planned', 'playing', 'finished', 'dropped'] as const
export type StatusFilter = PlayStatus | 'any'
export const STATUS_FILTERS: readonly StatusFilter[] = ['any', ...PLAY_STATUSES]

export const PLAY_STATUS_LABELS: Record<PlayStatus, string> = {
  unsorted: 'No status',
  planned: 'Planned',
  playing: 'Playing',
  finished: 'Finished',
  dropped: 'Dropped',
}

const FILTER_TESTS: Record<Filter, (game: GameInfo) => boolean> = {
  all: () => true,
  favorites: (game) => game.favorite,
  installed: (game) =>
    game.status === 'current' || game.status === 'outdated' || game.status === 'standalone',
  updates: (game) => game.status === 'outdated',
}

const byTitle = (a: GameInfo, b: GameInfo) =>
  a.title.localeCompare(b.title, undefined, { numeric: true })

const SORT_ORDERS: Record<Sort, (a: GameInfo, b: GameInfo) => number> = {
  recent: (a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0),
  title: byTitle,
  playtime: (a, b) => b.playMs - a.playMs,
  added: (a, b) => b.addedAt - a.addedAt,
}

export function arrangeGames(
  games: GameInfo[],
  query: string,
  filter: Filter,
  sort: Sort,
  status: StatusFilter = 'any',
): GameInfo[] {
  const text = query.trim().toLowerCase()
  return games
    .filter(
      (game) =>
        FILTER_TESTS[filter](game) &&
        (status === 'any' || game.playStatus === status) &&
        game.title.toLowerCase().includes(text),
    )
    .sort((a, b) => SORT_ORDERS[sort](a, b) || byTitle(a, b))
}
