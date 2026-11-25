import { onScopeDispose, reactive, readonly } from 'vue'

export function useViewport() {
  const size = reactive({ width: window.innerWidth, height: window.innerHeight })

  function update() {
    size.width = window.innerWidth
    size.height = window.innerHeight
  }

  window.addEventListener('resize', update)
  onScopeDispose(() => window.removeEventListener('resize', update))

  return readonly(size)
}

export function clampToViewport(value: number, size: number, viewport: number): number {
  return Math.max(0, Math.min(value, viewport - size))
}
