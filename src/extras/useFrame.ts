import { onBeforeUnmount, onMounted } from 'vue'

export function useFrame(draw: (now: number) => void): void {
  let request = 0

  function step(now: number) {
    request = requestAnimationFrame(step)
    try {
      draw(now)
    } catch {
      return
    }
  }

  onMounted(() => {
    request = requestAnimationFrame(step)
  })
  onBeforeUnmount(() => cancelAnimationFrame(request))
}
