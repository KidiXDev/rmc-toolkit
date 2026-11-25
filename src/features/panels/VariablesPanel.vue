<script setup lang="ts">
import { isEditableVariable, parseVariable, setVariable, variableEntries } from '@/cheats/gameData'
import { refreshLive, useLive } from '@/engine/live'
import UiCommitField from '@/ui/UiCommitField.vue'
import UiDataTable from '@/ui/UiDataTable.vue'

const entries = useLive(variableEntries, [])

function change(id: number, text: string) {
  setVariable(id, parseVariable(text))
  refreshLive()
}
</script>

<template>
  <UiDataTable v-slot="{ row }" :rows="entries">
    <UiCommitField
      v-if="isEditableVariable(row.value)"
      :label="row.name || `Variable ${row.id}`"
      :value="String(row.value)"
      @commit="(text) => change(row.id, text)"
    />
    <span v-else class="pr-2 text-dim" title="Objects cannot be edited here">
      {{ Array.isArray(row.value) ? 'list' : 'object' }}
    </span>
  </UiDataTable>
</template>
