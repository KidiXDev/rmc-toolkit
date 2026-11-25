import { ref } from 'vue'

const DURATION_MS = { info: 2600, error: 6000 }
const MAX_TOASTS = 3

export type ToastTone = keyof typeof DURATION_MS

export interface Toast {
  id: number
  message: string
  tone: ToastTone
}

export function createToasts() {
  const toasts = ref<Toast[]>([])
  let nextToastId = 0

  function dismissToast(id: number) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function notify(message: string, tone: ToastTone = 'info') {
    const id = nextToastId
    nextToastId += 1
    toasts.value = [...toasts.value, { id, message, tone }].slice(-MAX_TOASTS)
    window.setTimeout(() => dismissToast(id), DURATION_MS[tone])
  }

  return { toasts, notify, dismissToast }
}
