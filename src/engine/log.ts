import { isDeveloperMode } from './runtime'
import { createStorage } from './storage'

const LOG_NAME = 'rmc-log'
const MAX_LINES_PER_PAGE = 500
const MAX_MESSAGE_CHARS = 20_000

const pageId = Date.now().toString(36).slice(-4)

let lines = 0

function append(level: 'info' | 'error' | 'detail', message: string): void {
  if (lines >= MAX_LINES_PER_PAGE) return
  lines += 1

  try {
    createStorage().append(
      LOG_NAME,
      `${new Date().toISOString()} [${pageId}] ${level} ${message.slice(0, MAX_MESSAGE_CHARS)}\n`,
    )
  } catch {
    lines = MAX_LINES_PER_PAGE
  }
}

export function logEvent(message: string): void {
  append('info', message)
}

export function logDetail(message: string): void {
  if (isDeveloperMode()) append('detail', message)
}

export function logError(error: unknown): void {
  append('error', error instanceof Error ? (error.stack ?? error.message) : String(error))
}
