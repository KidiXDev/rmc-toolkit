<script setup lang="ts">
import { setSwitch, switchEntries } from '@/cheats/gameData'
import { refreshLive, useLive } from '@/engine/live'
import UiDataTable from '@/ui/UiDataTable.vue'
import UiToggle from '@/ui/UiToggle.vue'

const entries = useLive(switchEntries, [])

function change(id: number, value: boolean) {
  setSwitch(id, value)
  refreshLive()
}
</script>

<template>
  <UiDataTable v-slot="{ row }" :rows="entries">
    <UiToggle
      class="mr-2"
      :label="row.name || `Switch ${row.id}`"
      :model-value="row.value"
      @update:model-value="(value) => change(row.id, value)"
    />
  </UiDataTable>
</template>
