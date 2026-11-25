import { mountOverlay } from '@/overlay/mount'
import { useOverlay } from '@/stores/overlay'

import { setupMockGame } from './mockGame'

document.body.style.cssText = 'margin: 0; height: 100vh; background: #3b5249'

const game = setupMockGame()
mountOverlay()
useOverlay().isOpen = true

Object.assign(window, { mockGame: game })
