import { createPinia, setActivePinia } from 'pinia'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { useCheats } from '@/stores/cheats'
import { useOverlay } from '@/stores/overlay'

import { installShortcuts } from '../dispatcher'

const host = document.createElement('div')
const input = document.createElement('input')

function fire(type: 'keydown' | 'keyup', key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent(type, { key, bubbles: true, cancelable: true, ...init })
  const target = init.composed ? input : document.body
  target.dispatchEvent(event)
  return event
}

describe('installShortcuts', () => {
  beforeAll(() => {
    host.append(input)
    document.body.append(host)
    installShortcuts(host)
  })

  beforeEach(() => setActivePinia(createPinia()))

  it('toggles the window and keeps the key from the game', () => {
    const event = fire('keydown', 'c', { ctrlKey: true })

    expect(useOverlay().isOpen).toBe(true)
    expect(event.defaultPrevented).toBe(true)
  })

  it('leaves copy alone while typing in a field', () => {
    const event = fire('keydown', 'c', { ctrlKey: true, composed: true })

    expect(useOverlay().isOpen).toBe(false)
    expect(event.defaultPrevented).toBe(false)
  })

  it('holds fast-forward until release and never swallows keyup', () => {
    fire('keydown', '`')
    expect(useCheats().fastForward).toBe(true)

    const release = fire('keyup', '`')
    expect(useCheats().fastForward).toBe(false)
    expect(release.defaultPrevented).toBe(false)
  })

  it('ends fast-forward when the game loses focus', () => {
    fire('keydown', '`')
    window.dispatchEvent(new Event('blur'))

    expect(useCheats().fastForward).toBe(false)
  })
})
