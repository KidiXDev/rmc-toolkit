<script setup lang="ts">
import { ref } from 'vue'

import {
  INVENTORY_KINDS,
  inventoryEntries,
  maxAll,
  setQuantity,
  type InventoryKind,
} from '@/cheats/inventory'
import { refreshLive, useLive } from '@/engine/live'
import UiButton from '@/ui/UiButton.vue'
import UiButtonRow from '@/ui/UiButtonRow.vue'
import UiConfirmButton from '@/ui/UiConfirmButton.vue'
import UiDataTable from '@/ui/UiDataTable.vue'
import UiNumberField from '@/ui/UiNumberField.vue'

const KIND_LABELS: Record<InventoryKind, string> = {
  items: 'Items',
  weapons: 'Weapons',
  armors: 'Armors',
}

const kind = ref<InventoryKind>('items')
const entries = useLive(() => inventoryEntries(kind.value), [])

function apply(change: () => void) {
  change()
  refreshLive()
}
</script>

<template>
  <UiButtonRow>
    <UiButton
      v-for="option in INVENTORY_KINDS"
      :key="option"
      :active="option === kind"
      @click="kind = option"
    >
      {{ KIND_LABELS[option] }}
    </UiButton>
  </UiButtonRow>
  <UiDataTable :key="kind" :rows="entries">
    <template #actions>
      <UiConfirmButton @confirm="apply(() => maxAll(kind))">Max all</UiConfirmButton>
    </template>
    <template #default="{ row }">
      <div class="grid grid-flow-col items-center pr-1 gap-1.5" :title="row.description">
        <UiNumberField
          :label="`${row.name} quantity`"
          :model-value="row.quantity"
          :max="row.max"
          @update:model-value="(value) => apply(() => setQuantity(kind, row.id, value))"
        />
        <UiButton @click="apply(() => setQuantity(kind, row.id, row.max))">Max</UiButton>
      </div>
    </template>
  </UiDataTable>
</template>
