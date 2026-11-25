import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Page =
  | { name: 'home' }
  | { name: 'library' }
  | { name: 'activity' }
  | { name: 'settings' }
  | { name: 'game'; id: string }

export const useNavigation = defineStore('navigation', () => {
  const page = ref<Page>({ name: 'home' })
  const query = ref('')

  function openHome() {
    page.value = { name: 'home' }
  }

  function openActivity() {
    page.value = { name: 'activity' }
  }

  function openLibrary() {
    page.value = { name: 'library' }
  }

  function openSettings() {
    page.value = { name: 'settings' }
  }

  function openGame(id: string) {
    page.value = { name: 'game', id }
  }

  return { page, query, openHome, openActivity, openLibrary, openSettings, openGame }
})
