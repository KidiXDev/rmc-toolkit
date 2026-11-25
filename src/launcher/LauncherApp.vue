<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import ThemeRoot from '@/themes/ThemeRoot.vue'
import UiToast from '@/ui/UiToast.vue'

import { onGameDrop, onGameEnded, onLibraryChanged, onPlayFailed } from './api'
import FoundGamesDialog from './components/FoundGamesDialog.vue'
import SideBar from './components/SideBar.vue'
import StatusBar from './components/StatusBar.vue'
import TitleBar from './components/TitleBar.vue'
import { useLibrary } from './library'
import { useNavigation } from './navigation'
import ActivityPage from './pages/ActivityPage.vue'
import GamePage from './pages/GamePage.vue'
import HomePage from './pages/HomePage.vue'
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
    await onGameEnded((ended) => void library.onGameEnded(ended)),
    await onPlayFailed((reason) => library.notify(reason, 'error')),
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
  <ThemeRoot
    :theme-id="preferences.theme"
    :color-mode="preferences.colorMode"
    :effects="preferences.effects"
  >
    <div class="grid h-screen grid-rows-[auto_minmax(0,1fr)] bg-paper" @contextmenu.prevent>
      <TitleBar />
      <div class="grid min-h-0 grid-cols-[232px_minmax(0,1fr)]">
        <SideBar />
        <div class="relative grid min-h-0 grid-rows-[minmax(0,1fr)_auto]">
          <main class="min-h-0 overflow-hidden">
            <Transition name="page" mode="out-in">
              <GamePage v-if="openedGame" :key="openedGame.id" :game="openedGame" />
              <SettingsPage v-else-if="navigation.page.name === 'settings'" />
              <ActivityPage v-else-if="navigation.page.name === 'activity'" />
              <HomePage v-else-if="navigation.page.name === 'home'" />
              <LibraryPage v-else />
            </Transition>
          </main>
          <StatusBar />
          <Transition name="pop" :duration="{ enter: 260, leave: 130 }">
            <div
              v-if="isDropTarget"
              class="pointer-events-none absolute bottom-0 left-0 right-0 top-0 grid place-items-center bg-scrim"
            >
              <span
                class="pop-body rounded-window border-outline border-ink bg-paper px-8 py-5 font-display text-[28px] font-extrabold italic shadow-window"
              >
                Drop to add to your library
              </span>
            </div>
          </Transition>
        </div>
      </div>

      <Transition name="pop" :duration="{ enter: 260, leave: 130 }">
        <FoundGamesDialog v-if="library.found" :games="library.found" @add="library.addFound" />
      </Transition>

      <TransitionGroup
        name="toast"
        tag="div"
        class="pointer-events-none fixed bottom-12 left-[248px]"
      >
        <UiToast
          v-for="toast in library.toasts"
          :key="toast.id"
          class="!w-[340px]"
          :message="toast.message"
          :tone="toast.tone"
          @dismiss="library.dismissToast(toast.id)"
        />
      </TransitionGroup>
    </div>
  </ThemeRoot>
</template>
