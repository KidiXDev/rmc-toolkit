import { defineStore } from 'pinia'
import { ref } from 'vue'

import { createToasts } from './toasts'

export const useOverlay = defineStore('overlay', () => {
  const isOpen = ref(false)
  const activeTab = ref('general')

  function toggle() {
    isOpen.value = !isOpen.value
  }

  return { isOpen, activeTab, toggle, ...createToasts() }
})
