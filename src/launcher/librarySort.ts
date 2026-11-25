import type { GameInfo } from './api'

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

const FILTER_TESTS: Record<Filter, (game: GameInfo) => boolean> = {
  all: () => true,
  favorites: (game) => game.favorite,
  installed: (game) => game.status === 'current' || game.status === 'outdated',
  updates: (game) => game.status === 'outdated',
}

const byTitle = (a: GameInfo, b: GameInfo) =>
  a.title.localeCompare(b.title, undefined, { numeric: true })

const SORT_ORDERS: Record<Sort, (a: GameInfo, b: GameInfo) => number> = {
  recent: (a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0),
  title: byTitle,
  playtime: (a, b) => b.playSeconds - a.playSeconds,
  added: (a, b) => b.addedAt - a.addedAt,
}

export function arrangeGames(
  games: GameInfo[],
  query: string,
  filter: Filter,
  sort: Sort,
): GameInfo[] {
  const text = query.trim().toLowerCase()
  return games
    .filter((game) => FILTER_TESTS[filter](game) && game.title.toLowerCase().includes(text))
    .sort((a, b) => SORT_ORDERS[sort](a, b) || byTitle(a, b))
}
