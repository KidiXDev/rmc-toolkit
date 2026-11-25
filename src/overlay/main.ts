import { logError } from '@/engine/errorLog'

import { mountOverlay } from './mount'

function start() {
  try {
    mountOverlay()
  } catch (error) {
    logError(error)
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
else start()
