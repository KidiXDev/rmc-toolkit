<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

import { SHORTCUTS, type ShortcutDefinition } from '@/shortcuts/definitions'
import { comboOf, conflictOf, resetCombos, setCombo } from '@/shortcuts/hotkeys'
import { cancelRecording, recordCombo } from '@/shortcuts/recorder'
import UiButton from '@/ui/UiButton.vue'
import UiButtonRow from '@/ui/UiButtonRow.vue'
import UiConfirmButton from '@/ui/UiConfirmButton.vue'

const REQUIRED_ID = 'toggleWindow'

const recordingId = ref<string | null>(null)

function record(shortcut: ShortcutDefinition) {
  recordingId.value = shortcut.id
  recordCombo((combo) => {
    recordingId.value = null
    if (combo !== null) setCombo(shortcut, combo)
  })
}

function comboLabel(shortcut: ShortcutDefinition) {
  if (recordingId.value === shortcut.id) return 'Press a key'
  return comboOf(shortcut).replace('Control', 'Ctrl') || 'None'
}

onBeforeUnmount(cancelRecording)
</script>

<template>
  <div
    v-for="shortcut in SHORTCUTS"
    :key="shortcut.id"
    class="grid min-h-[30px] grid-cols-[1fr_auto_auto] items-center border-b-hairline gap-2 hover:bg-panel"
  >
    <span>
      {{ shortcut.label }}
      <span v-if="conflictOf(shortcut)" class="text-[11px] text-danger">
        same key as {{ conflictOf(shortcut)?.label }}
      </span>
    </span>
    <UiButton :active="recordingId === shortcut.id" @click="record(shortcut)">
      {{ comboLabel(shortcut) }}
    </UiButton>
    <UiButton
      :disabled="shortcut.id === REQUIRED_ID || comboOf(shortcut) === ''"
      @click="setCombo(shortcut, '')"
    >
      Clear
    </UiButton>
  </div>
  <UiButtonRow>
    <UiConfirmButton class="mt-2" @confirm="resetCombos">Reset all</UiConfirmButton>
  </UiButtonRow>
</template>
