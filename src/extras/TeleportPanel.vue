<script setup lang="ts">
import { ref } from 'vue'

import { useLive } from '@/engine/live'
import { rpg } from '@/engine/runtime'
import { useOverlay } from '@/stores/overlay'
import UiButton from '@/ui/UiButton.vue'
import UiDataTable from '@/ui/UiDataTable.vue'
import UiNumberField from '@/ui/UiNumberField.vue'
import UiRow from '@/ui/UiRow.vue'

import { mapEntries, teleport } from './teleport'

const overlay = useOverlay()
const maps = useLive(mapEntries, [])
const x = ref(rpg.$gamePlayer?.x ?? 0)
const y = ref(rpg.$gamePlayer?.y ?? 0)

function go(mapId: number) {
  if (!teleport(mapId, x.value, y.value)) overlay.notify('Teleport works only on the map', 'error')
}
</script>

<template>
  <UiRow label="Tile X and Y" hint="Check that the tile is inside the target map.">
    <UiNumberField v-model="x" label="Tile X" />
    <UiNumberField v-model="y" label="Tile Y" />
  </UiRow>
  <UiDataTable v-slot="{ row }" :rows="maps">
    <UiButton class="mr-1.5" @click="go(row.id)">Go</UiButton>
  </UiDataTable>
</template>
