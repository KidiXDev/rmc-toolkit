import { computed, onScopeDispose, ref, type ComputedRef } from 'vue'

const REFRESH_INTERVAL_MS = 250

const tick = ref(0)
let subscribers = 0
let timer: number | undefined

export function refreshLive(): void {
  tick.value += 1
}

function subscribe(): void {
  subscribers += 1
  timer ??= window.setInterval(refreshLive, REFRESH_INTERVAL_MS)
}

function unsubscribe(): void {
  subscribers -= 1
  if (subscribers > 0) return
  window.clearInterval(timer)
  timer = undefined
}

export function useLive<T>(read: () => T, fallback: T): ComputedRef<T> {
  let last = fallback

  subscribe()
  onScopeDispose(unsubscribe)

  return computed(() => {
    void tick.value
    try {
      last = read()
    } catch {
      return last
    }
    return last
  })
}
