<script setup lang="ts">
import { getCurrentWindow } from '@tauri-apps/api/window'
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

import { useNavigation } from '../navigation'

const appWindow = getCurrentWindow()
const navigation = useNavigation()
const search = useTemplateRef('search')

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

onMounted(() => window.addEventListener('keydown', focusSearch))
onBeforeUnmount(() => window.removeEventListener('keydown', focusSearch))
</script>

<template>
  <header
    data-tauri-drag-region
    class="grid h-10 grid-cols-[232px_minmax(0,1fr)_auto] items-center bg-ink text-paper"
  >
    <span data-tauri-drag-region class="pl-4 font-display text-[16px] font-extrabold italic">
      RMC Toolkit
    </span>
    <div data-tauri-drag-region class="grid justify-center">
      <input
        ref="search"
        v-model="navigation.query"
        type="text"
        spellcheck="false"
        class="h-6 w-[280px] rounded-control bg-paper px-2.5 text-[12px] text-ink"
        placeholder="Search your library (Ctrl+F)"
        aria-label="Search your library"
        @focus="navigation.openLibrary"
        @keydown.esc.stop="clearSearch"
      />
    </div>
    <div class="grid grid-flow-col">
      <button
        type="button"
        class="chrome-button h-10 w-11"
        aria-label="Minimize"
        @click="appWindow.minimize()"
      >
        <svg viewBox="0 0 10 10" class="mx-auto h-2.5 w-2.5 stroke-paper" fill="none">
          <path d="M0 5h10" />
        </svg>
      </button>
      <button
        type="button"
        class="chrome-button h-10 w-11"
        aria-label="Maximize or restore"
        @click="appWindow.toggleMaximize()"
      >
        <svg viewBox="0 0 10 10" class="mx-auto h-2.5 w-2.5 stroke-paper" fill="none">
          <path d="M.5 .5h9v9h-9z" />
        </svg>
      </button>
      <button
        type="button"
        class="chrome-button is-close h-10 w-11"
        aria-label="Close"
        @click="appWindow.close()"
      >
        <svg viewBox="0 0 10 10" class="mx-auto h-2.5 w-2.5 stroke-paper" fill="none">
          <path d="M0 0l10 10M10 0L0 10" />
        </svg>
      </button>
    </div>
  </header>
</template>
