import { logError } from '@/engine/log'

import { logPageStart } from './diagnostics'
import { mountOverlay } from './mount'

function attempt(action: () => void) {
  try {
    action()
  } catch (error) {
    logError(error)
  }
}

const start = () => attempt(mountOverlay)

attempt(logPageStart)

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
else start()
