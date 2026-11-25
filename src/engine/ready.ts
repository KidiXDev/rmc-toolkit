import { isGameReady } from './runtime'

const POLL_INTERVAL_MS = 100

export function whenGameReady(callback: () => void): void {
  if (isGameReady()) {
    callback()
    return
  }
  window.setTimeout(() => whenGameReady(callback), POLL_INTERVAL_MS)
}
