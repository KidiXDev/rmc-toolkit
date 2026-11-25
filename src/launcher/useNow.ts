import { onScopeDispose, ref, type Ref } from 'vue'

export function useNow(intervalMs = 1000): Readonly<Ref<number>> {
  const now = ref(Date.now())
  const timer = window.setInterval(() => {
    now.value = Date.now()
  }, intervalMs)
  onScopeDispose(() => window.clearInterval(timer))
  return now
}
