const PRESS_EVENTS = [
  'keydown',
  'keypress',
  'mousedown',
  'pointerdown',
  'touchstart',
  'click',
  'dblclick',
  'contextmenu',
  'wheel',
] as const

const TEXT_INPUT_TYPES = new Set(['text', 'number', 'search'])

export function eventTarget(event: Event): Element | null {
  const [target] = event.composedPath()
  return target instanceof Element ? target : null
}

export function isTextField(element: Element | null): boolean {
  if (element instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(element.type)
  return element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement
}

export function isolateFromGame(host: HTMLElement, root: ShadowRoot): void {
  for (const type of PRESS_EVENTS) {
    host.addEventListener(type, (event) => event.stopPropagation())
  }

  host.addEventListener('mousedown', (event) => {
    const target = eventTarget(event)
    const takesFocus = target instanceof HTMLInputElement || isTextField(target)
    if (!takesFocus) event.preventDefault()
  })

  document.addEventListener(
    'mousedown',
    (event) => {
      if (event.composedPath().includes(host)) return
      if (root.activeElement instanceof HTMLElement) root.activeElement.blur()
    },
    true,
  )
}
