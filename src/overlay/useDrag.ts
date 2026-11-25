import { ref } from 'vue'

interface Point {
  x: number
  y: number
}

interface DragOptions {
  position: () => Point
  onMove: (point: Point) => void
}

const CLICK_TOLERANCE_PX = 4

export function useDrag({ position, onMove }: DragOptions) {
  const isDragging = ref(false)
  const hasMoved = ref(false)
  let start: Point = { x: 0, y: 0 }
  let grab: Point = { x: 0, y: 0 }

  function onPointerdown(event: PointerEvent) {
    if (event.button !== 0 || !(event.currentTarget instanceof HTMLElement)) return
    event.currentTarget.setPointerCapture(event.pointerId)
    isDragging.value = true
    hasMoved.value = false
    start = { x: event.clientX, y: event.clientY }
    grab = { x: event.clientX - position().x, y: event.clientY - position().y }
  }

  function onPointermove(event: PointerEvent) {
    if (!isDragging.value) return
    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y)
    if (distance > CLICK_TOLERANCE_PX) hasMoved.value = true
    onMove({ x: event.clientX - grab.x, y: event.clientY - grab.y })
  }

  function onPointerup() {
    isDragging.value = false
  }

  return {
    isDragging,
    hasMoved,
    handlers: {
      pointerdown: onPointerdown,
      pointermove: onPointermove,
      pointerup: onPointerup,
      pointercancel: onPointerup,
    },
  }
}
