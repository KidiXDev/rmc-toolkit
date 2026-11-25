<script setup lang="ts">
import { ref } from 'vue'

import { useLive } from '@/engine/live'
import { currentMapLabel } from '@/engine/runtime'
import { useOverlay } from '@/stores/overlay'
import type { SavedLocation } from '@/stores/sanitize'
import { useSettings } from '@/stores/settings'
import UiButton from '@/ui/UiButton.vue'
import UiConfirmButton from '@/ui/UiConfirmButton.vue'
import UiTextField from '@/ui/UiTextField.vue'

import { deleteLocation, goToLocation, saveCurrentLocation } from './locations'

const overlay = useOverlay()
const settings = useSettings()
const label = ref('')
const mapLabel = useLive(currentMapLabel, '')

function save() {
  if (saveCurrentLocation(label.value)) label.value = ''
  else overlay.notify('Start or load a game first', 'error')
}

function go(location: SavedLocation) {
  if (!goToLocation(location)) overlay.notify('Teleport works only on the map', 'error')
}
</script>

<template>
  <div class="mb-1.5 grid grid-cols-[1fr_auto] items-center gap-2">
    <UiTextField v-model="label" label="Place name" :placeholder="`Name (${mapLabel})`" />
    <UiButton variant="primary" @click="save">Save here</UiButton>
  </div>
  <p v-if="settings.locations.length === 0" class="py-2 text-dim">No saved places yet.</p>
  <div
    v-for="location in settings.locations"
    :key="location.id"
    class="grid min-h-[30px] grid-cols-[1fr_auto_auto] items-center border-b-hairline gap-2 hover:bg-panel"
  >
    <span class="truncate" :title="`${location.mapName} (${location.x}, ${location.y})`">
      {{ location.label }}
    </span>
    <UiButton @click="go(location)">Go</UiButton>
    <UiConfirmButton @confirm="deleteLocation(location.id)">Delete</UiConfirmButton>
  </div>
</template>
