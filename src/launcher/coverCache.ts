import { reactive } from 'vue'

import { gameCover } from './api'

const urls = reactive(new Map<string, string | null>())
const requested = new Set<string>()

export function coverUrl(id: string, key: string): string | null {
  if (!requested.has(key)) {
    requested.add(key)
    gameCover(id)
      .then((url) => urls.set(key, url))
      .catch(() => urls.set(key, null))
  }
  return urls.get(key) ?? null
}
