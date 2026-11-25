import { defineStore } from 'pinia'
import { ref } from 'vue'

const TOAST_DURATION_MS = 2600
const MAX_TOASTS = 3

export type ToastTone = 'info' | 'error'

export interface Toast {
  id: number
  message: string
  tone: ToastTone
}

export const useOverlay = defineStore('overlay', () => {
  const isOpen = ref(false)
  const activeTab = ref('general')
  const toasts = ref<Toast[]>([])
  let nextToastId = 0

  function toggle() {
    isOpen.value = !isOpen.value
  }

  function dismissToast(id: number) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function notify(message: string, tone: ToastTone = 'info') {
    const id = nextToastId
    nextToastId += 1
    toasts.value = [...toasts.value, { id, message, tone }].slice(-MAX_TOASTS)
    window.setTimeout(() => dismissToast(id), TOAST_DURATION_MS)
  }

  return { isOpen, activeTab, toasts, toggle, notify, dismissToast }
})
