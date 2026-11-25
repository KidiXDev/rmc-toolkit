import { describe, expect, it } from 'vitest'

import { dailyTotals, playedByGame, summarize } from '../activityStats'
import type { PlaySession } from '../api'

const HOUR = 3_600_000
const NOW = new Date(2026, 4, 20, 15, 0).getTime()
const at = (day: number, hour: number) => new Date(2026, 4, day, hour, 0).getTime()

function session(game: string, startedAt: number, hours: number): PlaySession {
  return {
    game,
    startedAt,
    endedAt: startedAt + hours * HOUR,
    playedMs: hours * HOUR,
    origin: 'launcher',
  }
}

const sessions = [
  session('old', at(1, 10), 5),
  session('moon', at(18, 23), 2),
  session('ash', at(20, 9), 1),
]

describe('dailyTotals', () => {
  it('splits a session that crosses midnight', () => {
    const hours = dailyTotals(sessions, 3, NOW).map((day) => day.playedMs / HOUR)
    expect(hours).toEqual([1, 1, 1])
  })

  it('keeps days at local midnight across clock changes', () => {
    const days = dailyTotals([], 365, NOW)
    expect(days.every((day) => new Date(day.start).getHours() === 0)).toBe(true)
    expect(new Set(days.map((day) => new Date(day.start).toDateString())).size).toBe(365)
  })
})

describe('summaries', () => {
  it('counts only the chosen range', () => {
    expect(summarize(sessions, 7, NOW)).toEqual({
      playedMs: 3 * HOUR,
      sessions: 2,
      longestMs: 2 * HOUR,
      activeDays: 3,
    })
  })

  it('ranks games by time in the range', () => {
    expect(playedByGame(sessions, 7, NOW).map((entry) => entry.game)).toEqual(['moon', 'ash'])
  })
})
