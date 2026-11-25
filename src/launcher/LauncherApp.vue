<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import ThemeRoot from '@/themes/ThemeRoot.vue'
import UiToast from '@/ui/UiToast.vue'

import { onGameDrop, onLibraryChanged } from './api'
import FoundGamesDialog from './components/FoundGamesDialog.vue'
import SideBar from './components/SideBar.vue'
import StatusBar from './components/StatusBar.vue'
import TitleBar from './components/TitleBar.vue'
import { useLibrary } from './library'
import { useNavigation } from './navigation'
import GamePage from './pages/GamePage.vue'
import LibraryPage from './pages/LibraryPage.vue'
import SettingsPage from './pages/SettingsPage.vue'
import { usePreferences } from './preferences'

const library = useLibrary()
const navigation = useNavigation()
const preferences = usePreferences()

const isDropTarget = ref(false)
const stops: Array<() => void> = []

const openedGame = computed(() =>
  navigation.page.name === 'game' ? library.gameById(navigation.page.id) : undefined,
)

const refresh = () => void library.attempt(library.refresh)

onMounted(async () => {
  void library.start()
  window.addEventListener('focus', refresh)
  stops.push(
    await onLibraryChanged(refresh),
    await onGameDrop((event) => {
      isDropTarget.value = event.type === 'enter'
      if (event.type === 'drop') void library.add(event.paths)
    }),
  )
})

onBeforeUnmount(() => {
  window.removeEventListener('focus', refresh)
  for (const stop of stops) stop()
})
</script>

<template>
  <ThemeRoot :theme-id="preferences.theme" :effects="preferences.effects">
    <div class="grid h-screen grid-rows-[auto_minmax(0,1fr)] bg-paper" @contextmenu.prevent>
      <TitleBar />
      <div class="grid min-h-0 grid-cols-[232px_minmax(0,1fr)]">
        <SideBar />
        <div class="relative grid min-h-0 grid-rows-[minmax(0,1fr)_auto]">
          <main class="min-h-0">
            <GamePage v-if="openedGame" :key="openedGame.id" :game="openedGame" />
            <SettingsPage v-else-if="navigation.page.name === 'settings'" />
            <LibraryPage v-else />
          </main>
          <StatusBar />
          <div
            v-if="isDropTarget"
            class="pointer-events-none absolute bottom-0 left-0 right-0 top-0 grid place-items-center bg-soft font-display text-[32px] font-extrabold italic opacity-95"
          >
            Drop to add to your library
          </div>
        </div>
      </div>

      <FoundGamesDialog v-if="library.found" :games="library.found" @add="library.addFound" />

      <div class="pointer-events-none fixed bottom-12 left-[248px]">
        <UiToast
          v-for="toast in library.toasts"
          :key="toast.id"
          class="!w-[340px]"
          :message="toast.message"
          :tone="toast.tone"
          @dismiss="library.dismissToast(toast.id)"
        />
      </div>
    </div>
  </ThemeRoot>
</template>
