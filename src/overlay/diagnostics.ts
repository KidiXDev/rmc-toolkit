import { watch } from 'vue'

import { logDetail, logError, logEvent } from '@/engine/log'
import { whenGameReady } from '@/engine/ready'
import { isDeveloperMode, rpg } from '@/engine/runtime'
import { useOverlay } from '@/stores/overlay'

const SNAPSHOT_INTERVAL_MS = 500
const SNAPSHOT_PERIOD_MS = 60_000
const AFTER_TOGGLE_MS = 600
const BADGE_OFFSET_PX = 30

const page = document as Document & { webkitFullscreenElement?: Element | null }

const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta'])

function nameOf(element: Element | null | undefined): string {
  if (!element) return 'nothing'
  return element.id ? `${element.localName}#${element.id}` : element.localName
}

function rectOf(element: Element): string {
  const { left, top, width, height } = element.getBoundingClientRect()
  return [left, top, width, height].map(Math.round).join(',')
}

function describe(element: Element): string {
  const css = window.getComputedStyle(element)
  const hidden = [
    css.display === 'none' && 'display:none',
    css.visibility !== 'visible' && css.visibility,
    css.opacity !== '1' && `opacity:${css.opacity}`,
    css.transform !== 'none' && `transform:${css.transform}`,
    css.filter !== 'none' && `filter:${css.filter}`,
  ].filter(Boolean)
  return [nameOf(element), css.position, `z:${css.zIndex}`, rectOf(element), ...hidden].join(' ')
}

function badgeState(root: ShadowRoot): string {
  const badge = root.querySelector('[aria-label="Open RMC Toolkit"]')
  return badge ? describe(badge) : 'not shown'
}

function windowState(root: ShadowRoot): string {
  const dialog = root.querySelector('[role="dialog"]')
  return dialog ? describe(dialog) : 'not shown'
}

function snapshot(host: HTMLElement, root: ShadowRoot): string {
  const { innerWidth, innerHeight, outerWidth, outerHeight, devicePixelRatio } = window
  const visible = [...document.body.children].filter((element) => element.localName !== 'script')
  const badgeCorner = document.elementFromPoint(
    innerWidth - BADGE_OFFSET_PX,
    innerHeight - BADGE_OFFSET_PX + 5,
  )

  return [
    `window ${innerWidth}x${innerHeight} outer ${outerWidth}x${outerHeight} ratio ${devicePixelRatio}`,
    `fullscreen ${nameOf(page.fullscreenElement ?? page.webkitFullscreenElement)}`,
    `scene ${rpg.SceneManager?._scene?.constructor.name ?? 'none'}`,
    `overlay in ${host.isConnected ? nameOf(host.parentElement) : 'no page'}: ${describe(host)}`,
    `badge ${badgeState(root)}, top element there ${nameOf(badgeCorner)}`,
    `cheat window ${windowState(root)}`,
    describe(document.body),
    ...visible.map(describe),
  ].join('\n    ')
}

export function logPageStart(): void {
  const versions = rpg.process?.versions
  const plugins = (rpg.$plugins ?? []).filter(({ status }) => status).map(({ name }) => name)

  logEvent(
    `toolkit ${__APP_VERSION__} started, nw ${versions?.nw ?? 'none'}, chromium ${versions?.chromium ?? 'unknown'}`,
  )
  logDetail(
    [
      `page ${window.location.href}`,
      `${document.readyState}, ${window.top === window ? 'main' : 'inner'} frame`,
      `screen ${window.screen.width}x${window.screen.height}`,
      `plugins ${plugins.join(', ') || 'none'}`,
    ].join('\n    '),
  )
}

function watchDetails(host: HTMLElement, root: ShadowRoot): void {
  let last = ''

  function logSnapshot(reason: string) {
    try {
      const current = snapshot(host, root)
      if (current === last) return
      last = current
      logDetail(`${reason}\n    ${current}`)
    } catch (error) {
      logError(error)
    }
  }

  function logKey(event: KeyboardEvent) {
    if (!event.ctrlKey || event.repeat || MODIFIER_KEYS.has(event.key)) return
    logDetail(`key Ctrl+${event.key} reached the page, focus on ${nameOf(document.activeElement)}`)
  }

  logSnapshot('overlay mounted')
  const timer = window.setInterval(() => logSnapshot('page changed'), SNAPSHOT_INTERVAL_MS)
  window.setTimeout(() => window.clearInterval(timer), SNAPSHOT_PERIOD_MS)
  whenGameReady(() => logSnapshot('game ready'))

  watch(
    () => useOverlay().isOpen,
    (isOpen) => {
      logDetail(`cheat window ${isOpen ? 'opened' : 'closed'}`)
      window.setTimeout(() => logSnapshot('after toggle'), AFTER_TOGGLE_MS)
    },
  )

  window.addEventListener('keydown', logKey, true)
}

export function watchPage(host: HTMLElement, root: ShadowRoot): void {
  if (isDeveloperMode()) watchDetails(host, root)

  whenGameReady(() => logEvent('game ready'))
  window.addEventListener('beforeunload', () => logEvent('page is closing or reloading'))
  window.addEventListener('error', ({ error, message }) => logError(error ?? message))
  window.addEventListener('unhandledrejection', ({ reason }) => logError(reason))
}
