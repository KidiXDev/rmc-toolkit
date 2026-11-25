import { describe, expect, it } from 'vitest'

import type { GameInfo } from '../api'
import { formatBytes, formatPlaytime } from '../format'
import { arrangeGames } from '../librarySort'
import { sanitizePreferences } from '../preferences'

function game(title: string, changes: Partial<GameInfo> = {}): GameInfo {
  return {
    id: title,
    path: '',
    title,
    defaultTitle: title,
    engine: 'MV',
    makerVersion: null,
    isSupported: true,
    status: 'notInstalled',
    cheatVersion: null,
    executable: null,
    isRunning: false,
    favorite: false,
    playSeconds: 0,
    lastPlayed: null,
    addedAt: 0,
    coverKey: title,
    ...changes,
  }
}

const games = [
  game('Chapter 10', { playSeconds: 50, favorite: true }),
  game('Chapter 2', { lastPlayed: 5, status: 'outdated' }),
  game('Azure', { lastPlayed: 9, status: 'current', addedAt: 3 }),
]

const titles = (
  ...args: [string, Parameters<typeof arrangeGames>[2], Parameters<typeof arrangeGames>[3]]
) => arrangeGames(games, ...args).map(({ title }) => title)

describe('arrangeGames', () => {
  it('sorts by each order with the title as a tie breaker', () => {
    expect(titles('', 'all', 'recent')).toEqual(['Azure', 'Chapter 2', 'Chapter 10'])
    expect(titles('', 'all', 'title')).toEqual(['Azure', 'Chapter 2', 'Chapter 10'])
    expect(titles('', 'all', 'playtime')).toEqual(['Chapter 10', 'Azure', 'Chapter 2'])
    expect(titles('', 'all', 'added')).toEqual(['Azure', 'Chapter 2', 'Chapter 10'])
  })

  it('filters and searches together', () => {
    expect(titles('', 'installed', 'title')).toEqual(['Azure', 'Chapter 2'])
    expect(titles('chapter', 'updates', 'title')).toEqual(['Chapter 2'])
    expect(titles('', 'favorites', 'title')).toEqual(['Chapter 10'])
  })
})

describe('formatting', () => {
  it('keeps numbers readable', () => {
    expect([0, 30, 600, 5400].map(formatPlaytime)).toEqual([
      'Not played yet',
      'Less than a minute',
      '10 min',
      '1.5 h',
    ])
    expect([10, 2048, 3_145_728].map(formatBytes)).toEqual(['1 KB', '2 KB', '3.0 MB'])
  })
})

describe('sanitizePreferences', () => {
  it('replaces anything invalid with the default', () => {
    expect(sanitizePreferences({ sort: 'oldest', layout: 'list', effects: 'no' })).toMatchObject({
      sort: 'recent',
      layout: 'list',
      effects: true,
    })
  })
})
