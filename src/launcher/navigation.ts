import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Page = { name: 'library' } | { name: 'settings' } | { name: 'game'; id: string }

export const useNavigation = defineStore('navigation', () => {
  const page = ref<Page>({ name: 'library' })
  const query = ref('')

  function openLibrary() {
    page.value = { name: 'library' }
  }

  function openSettings() {
    page.value = { name: 'settings' }
  }

  function openGame(id: string) {
    page.value = { name: 'game', id }
  }

  return { page, query, openLibrary, openSettings, openGame }
})
