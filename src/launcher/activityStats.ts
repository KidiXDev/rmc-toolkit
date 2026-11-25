import type { PlaySession } from './api'

const DAY_HOURS = 24

export interface DayTotal {
  start: number
  playedMs: number
}

export interface ActivitySummary {
  playedMs: number
  sessions: number
  longestMs: number
  activeDays: number
}

function startOfDay(time: number): number {
  const date = new Date(time)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function shiftDays(dayStart: number, days: number): number {
  const date = new Date(dayStart)
  date.setDate(date.getDate() + days)
  return date.getTime()
}

function sharePlayed(session: PlaySession, from: number, to: number): number {
  const span = session.endedAt - session.startedAt
  if (span <= 0) return session.startedAt >= from && session.startedAt < to ? session.playedMs : 0
  const overlap = Math.min(to, session.endedAt) - Math.max(from, session.startedAt)
  return overlap <= 0 ? 0 : (session.playedMs * overlap) / span
}

export function dailyTotals(sessions: PlaySession[], days: number, now: number): DayTotal[] {
  const today = startOfDay(now)
  return Array.from({ length: days }, (_, index) => {
    const start = shiftDays(today, index - days + 1)
    const end = shiftDays(start, 1)
    const playedMs = sessions.reduce((sum, session) => sum + sharePlayed(session, start, end), 0)
    return { start, playedMs }
  })
}

export function sessionsWithin(sessions: PlaySession[], days: number, now: number): PlaySession[] {
  const from = shiftDays(startOfDay(now), 1 - days)
  return sessions.filter((session) => session.endedAt >= from)
}

export function summarize(sessions: PlaySession[], days: number, now: number): ActivitySummary {
  const recent = sessionsWithin(sessions, days, now)
  const totals = dailyTotals(sessions, days, now)
  return {
    playedMs: totals.reduce((sum, day) => sum + day.playedMs, 0),
    sessions: recent.length,
    longestMs: Math.max(0, ...recent.map((session) => session.playedMs)),
    activeDays: totals.filter((day) => day.playedMs > 0).length,
  }
}

export function playedByGame(sessions: PlaySession[], days: number, now: number) {
  const from = shiftDays(startOfDay(now), 1 - days)
  const totals = new Map<string, number>()
  for (const session of sessions) {
    const played = sharePlayed(session, from, now + DAY_HOURS * 3_600_000)
    if (played > 0) totals.set(session.game, (totals.get(session.game) ?? 0) + played)
  }
  return [...totals]
    .map(([game, playedMs]) => ({ game, playedMs }))
    .sort((a, b) => b.playedMs - a.playedMs)
}
