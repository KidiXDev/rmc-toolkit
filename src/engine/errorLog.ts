import { createStorage } from './storage'

const LOG_NAME = 'rmc-errors'
const MAX_ENTRIES = 30

interface LogEntry {
  time: string
  version: string
  message: string
}

const entries: LogEntry[] = []

export function logError(error: unknown): void {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error)
  entries.push({ time: new Date().toISOString(), version: __APP_VERSION__, message })
  entries.splice(0, entries.length - MAX_ENTRIES)

  try {
    createStorage().write(LOG_NAME, entries)
  } catch {
    entries.length = 0
  }
}
