import { defineStore } from 'pinia'
import { reactive, toRefs, watch } from 'vue'

import { logError } from '@/engine/log'
import { createStorage } from '@/engine/storage'

import { sanitizeSettings } from './sanitize'

const STORAGE_NAME = 'rmc-settings'
const WRITE_DELAY_MS = 400

export const useSettings = defineStore('settings', () => {
  const storage = createStorage()
  const state = reactive(sanitizeSettings(storage.read(STORAGE_NAME)))
  let pendingWrite: number | undefined

  function persist() {
    pendingWrite = undefined
    try {
      storage.write(STORAGE_NAME, state)
    } catch (error) {
      logError(error)
    }
  }

  watch(
    state,
    () => {
      window.clearTimeout(pendingWrite)
      pendingWrite = window.setTimeout(persist, WRITE_DELAY_MS)
    },
    { deep: true },
  )

  window.addEventListener('beforeunload', () => {
    if (pendingWrite !== undefined) persist()
  })

  return toRefs(state)
})
