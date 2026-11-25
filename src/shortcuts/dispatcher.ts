import { eventTarget, isTextField } from '@/engine/inputGate'
import { useOverlay } from '@/stores/overlay'

import { eventReleasesCombo, eventToCombo } from './combo'
import type { ShortcutDefinition } from './definitions'
import { comboOf, findShortcut } from './hotkeys'
import { cancelRecording, finishRecording, isRecording } from './recorder'

function swallow(event: Event): void {
  event.preventDefault()
  event.stopImmediatePropagation()
}

function record(event: KeyboardEvent): void {
  swallow(event)
  if (event.key === 'Escape') {
    cancelRecording()
    return
  }
  const combo = eventToCombo(event)
  if (combo) finishRecording(combo)
}

export function installShortcuts(host: HTMLElement): void {
  const held = new Set<ShortcutDefinition>()

  function releaseAll() {
    for (const shortcut of held) shortcut.release?.()
    held.clear()
  }

  function leaveWindow(event: KeyboardEvent): boolean {
    if (event.key !== 'Escape' || !event.composedPath().includes(host)) return false

    const target = eventTarget(event)
    if (!isTextField(target)) {
      swallow(event)
      useOverlay().isOpen = false
    }
    return true
  }

  function onKeyDown(event: KeyboardEvent) {
    if (isRecording()) {
      record(event)
      return
    }
    if (leaveWindow(event) || isTextField(eventTarget(event))) return

    const shortcut = findShortcut(eventToCombo(event))
    if (!shortcut) return

    swallow(event)
    if (event.repeat) return
    if (shortcut.release) held.add(shortcut)
    shortcut.run()
  }

  function onKeyUp(event: KeyboardEvent) {
    for (const shortcut of held) {
      if (!eventReleasesCombo(event, comboOf(shortcut))) continue
      held.delete(shortcut)
      shortcut.release?.()
    }
  }

  window.addEventListener('keydown', onKeyDown, true)
  window.addEventListener('keyup', onKeyUp, true)
  window.addEventListener('blur', releaseAll)
}
