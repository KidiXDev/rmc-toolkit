<script setup lang="ts">
import { getCurrentWindow } from '@tauri-apps/api/window'
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

import { useNavigation } from '../navigation'

const appWindow = getCurrentWindow()
const navigation = useNavigation()
const search = useTemplateRef('search')
const isMaximized = ref(false)

let stopListening: (() => void) | undefined

async function readMaximized() {
  isMaximized.value = await appWindow.isMaximized()
}

function focusSearch(event: KeyboardEvent) {
  if (event.key.toLowerCase() !== 'f' || !(event.ctrlKey || event.metaKey)) return
  event.preventDefault()
  navigation.openLibrary()
  search.value?.focus()
  search.value?.select()
}

function clearSearch() {
  navigation.query = ''
  search.value?.blur()
}

onMounted(async () => {
  window.addEventListener('keydown', focusSearch)
  await readMaximized()
  stopListening = await appWindow.onResized(() => void readMaximized())
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', focusSearch)
  stopListening?.()
})
</script>

<template>
  <header
    data-tauri-drag-region
    class="grid h-10 grid-cols-[232px_minmax(0,1fr)_auto] items-center bg-chrome text-onchrome"
  >
    <span data-tauri-drag-region class="pl-4 font-display text-[16px] font-extrabold italic">
      RMC Toolkit
    </span>
    <div data-tauri-drag-region class="grid justify-center">
      <div class="relative">
        <input
          ref="search"
          v-model="navigation.query"
          type="text"
          spellcheck="false"
          class="h-[26px] w-[300px] rounded-control border-hairline border-transparent bg-chrome-hover pl-2.5 pr-7 text-[12px] text-onchrome placeholder:text-onchrome-dim hover:border-onchrome-dim focus:border-accent"
          placeholder="Search your library (Ctrl+F)"
          aria-label="Search your library"
          @focus="navigation.openLibrary"
          @keydown.esc.stop="clearSearch"
        />
        <button
          v-if="navigation.query"
          type="button"
          class="absolute right-0 top-0 h-[26px] w-7 text-onchrome-dim hover:text-onchrome"
          aria-label="Clear search"
          @click="clearSearch"
        >
          ✕
        </button>
      </div>
    </div>
    <div class="grid grid-flow-col">
      <button
        type="button"
        class="h-10 w-11 hover:bg-chrome-hover"
        aria-label="Minimize"
        @click="appWindow.minimize()"
      >
        <svg viewBox="0 0 10 10" class="mx-auto h-2.5 w-2.5 fill-none stroke-onchrome">
          <path d="M0 5h10" />
        </svg>
      </button>
      <button
        type="button"
        class="h-10 w-11 hover:bg-chrome-hover"
        :aria-label="isMaximized ? 'Restore' : 'Maximize'"
        @click="appWindow.toggleMaximize()"
      >
        <svg viewBox="0 0 10 10" class="mx-auto h-2.5 w-2.5 fill-none stroke-onchrome">
          <path v-if="isMaximized" d="M2.5 2.5v-2h7v7h-2M.5 2.5h7v7h-7z" />
          <path v-else d="M.5 .5h9v9h-9z" />
        </svg>
      </button>
      <button
        type="button"
        class="h-10 w-11 hover:bg-danger"
        aria-label="Close"
        @click="appWindow.close()"
      >
        <svg viewBox="0 0 10 10" class="mx-auto h-2.5 w-2.5 fill-none stroke-onchrome">
          <path d="M0 0l10 10M10 0L0 10" />
        </svg>
      </button>
    </div>
  </header>
</template>
