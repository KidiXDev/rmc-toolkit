import { createPinia } from 'pinia'
import { createApp } from 'vue'

import { installCheats } from '@/cheats/install'
import { logError } from '@/engine/errorLog'
import { isolateFromGame } from '@/engine/inputGate'
import { whenGameReady } from '@/engine/ready'
import { installShortcuts } from '@/shortcuts/dispatcher'
import { useOverlay } from '@/stores/overlay'

import App from './App.vue'

import styles from '@/ui/styles.css?inline'

const HOST_ID = 'rmc-cheat-host'

function createHost(): { host: HTMLElement; root: ShadowRoot } {
  const host = document.createElement('div')
  host.id = HOST_ID
  document.body.append(host)
  return { host, root: host.attachShadow({ mode: 'open' }) }
}

export function mountOverlay(): void {
  if (document.getElementById(HOST_ID)) return

  const { host, root } = createHost()
  const style = document.createElement('style')
  const container = document.createElement('div')
  style.textContent = styles
  root.append(style, container)

  const app = createApp(App)
  app.use(createPinia())
  app.config.errorHandler = (error) => {
    logError(error)
    useOverlay().notify('Something went wrong. See rmc-errors.json.', 'error')
  }
  app.mount(container)

  isolateFromGame(host, root)
  installShortcuts(host)
  whenGameReady(installCheats)
}
