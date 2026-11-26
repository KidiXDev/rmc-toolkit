<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'

import UiButton from '@/ui/UiButton.vue'
import UiPopup from '@/ui/UiPopup.vue'
import UiSelect from '@/ui/UiSelect.vue'

import type { Folder, GameInfo } from '../api'
import { isLiveReady } from '../gamePage'
import { useLibrary } from '../library'
import { PLAY_STATUS_LABELS, PLAY_STATUSES } from '../librarySort'
import type { GameTabId } from '../navigation'

const { game } = defineProps<{ game: GameInfo }>()
const emit = defineEmits<{ openTab: [tab: GameTabId] }>()

const FOLDERS: ReadonlyArray<{ folder: Folder; label: string }> = [
  { folder: 'game', label: 'Open game folder' },
  { folder: 'saves', label: 'Open saves folder' },
  { folder: 'backups', label: 'Open backups folder' },
]

const library = useLibrary()
const statusOptions = PLAY_STATUSES.map((value) => ({ value, label: PLAY_STATUS_LABELS[value] }))

const foldersAnchor = useTemplateRef('foldersAnchor')
const foldersMenu = useTemplateRef('foldersMenu')
const isFoldersOpen = ref(false)

const isBusy = computed(() => library.busyIds.has(game.id))
const needsCheatsAction = computed(
  () => game.status === 'notInstalled' || game.status === 'outdated',
)

async function toggleFolders() {
  isFoldersOpen.value = !isFoldersOpen.value
  if (isFoldersOpen.value) {
    await nextTick()
    foldersMenu.value?.focus({ preventScroll: true })
  }
}

function chooseFolder(folder: Folder) {
  isFoldersOpen.value = false
  void library.openFolder(game, folder)
}
</script>

<template>
  <div
    class="flex flex-wrap items-center justify-between border-b-hairline bg-panel px-5 py-2 gap-2"
  >
    <div class="flex flex-wrap items-center gap-2">
      <UiSelect
        label="Status"
        :model-value="game.playStatus"
        :options="statusOptions"
        @update:model-value="(status) => library.setPlayStatus(game, status)"
      />
      <UiButton
        v-if="needsCheatsAction"
        variant="primary"
        :disabled="game.session !== null || isBusy"
        @click="library.install(game)"
      >
        {{ game.status === 'outdated' ? 'Update cheats' : 'Install cheats' }}
      </UiButton>
      <UiButton v-else-if="isLiveReady(game)" variant="primary" @click="emit('openTab', 'live')">
        Live controls
      </UiButton>
      <UiButton v-else-if="!game.isSupported" variant="danger" @click="emit('openTab', 'cheats')">
        Old engine
      </UiButton>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <UiButton :disabled="isBusy" @click="library.backupSaves(game)">Back up saves</UiButton>
      <span ref="foldersAnchor" class="inline-block">
        <UiButton
          :active="isFoldersOpen"
          aria-haspopup="menu"
          :aria-expanded="isFoldersOpen"
          @click="toggleFolders"
        >
          Folders ▾
        </UiButton>
      </span>
      <UiPopup :anchor="foldersAnchor" :open="isFoldersOpen" @close="isFoldersOpen = false">
        <div
          ref="foldersMenu"
          role="menu"
          tabindex="-1"
          aria-label="Game folders"
          class="grid min-w-[170px] rounded-control border-outline border-ink bg-paper p-1 text-sm shadow-control"
          @keydown.esc.stop="isFoldersOpen = false"
        >
          <button
            v-for="(item, index) in FOLDERS"
            :key="item.folder"
            type="button"
            role="menuitem"
            class="pop-row smooth rounded-[5px] px-2.5 py-1.5 text-left hover:bg-soft"
            :style="{ '--row': index }"
            @click="chooseFolder(item.folder)"
          >
            {{ item.label }}
          </button>
        </div>
      </UiPopup>
    </div>
  </div>
</template>
