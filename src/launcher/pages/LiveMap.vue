<script setup lang="ts">
import { ref, watch } from 'vue'

import type { LiveAction, LiveDetail, LiveMapCamera } from '@/engine/liveProtocol'
import UiButton from '@/ui/UiButton.vue'
import UiNumberField from '@/ui/UiNumberField.vue'
import UiRow from '@/ui/UiRow.vue'
import UiSection from '@/ui/UiSection.vue'

import LiveCatalog from './LiveCatalog.vue'
import LiveMapCanvas from './LiveMapCanvas.vue'

const { detail } = defineProps<{
  map: string
  detail: Extract<LiveDetail, { kind: 'map' }>
  search: string
}>()
const emit = defineEmits<{
  action: [value: LiveAction]
  camera: [value: LiveMapCamera | null]
  search: [value: string]
  page: [value: number]
}>()

const x = ref(0)
const y = ref(0)

function usePlayerTile() {
  if (!detail.preview) return
  x.value = detail.preview.x
  y.value = detail.preview.y
}

watch(() => detail.preview?.mapId, usePlayerTile, { immediate: true })

function selectTile(tileX: number, tileY: number) {
  x.value = tileX
  y.value = tileY
}

function move(kind: 'walk' | 'teleport', destination?: number) {
  const fromMapId = detail.preview?.mapId
  if (fromMapId === undefined || !detail.canMove) return
  emit('action', { kind, fromMapId, mapId: destination ?? fromMapId, x: x.value, y: y.value })
}
</script>

<template>
  <UiSection title="Current map">
    <div v-if="detail.preview" class="grid gap-2">
      <p>
        <strong>{{ map }}</strong>
        <span class="pl-2 font-mono text-[12px] text-dim">
          {{ detail.preview.x }}, {{ detail.preview.y }} · {{ detail.preview.width }} ×
          {{ detail.preview.height }}
        </span>
      </p>
      <LiveMapCanvas
        :preview="detail.preview"
        :selected-x="x"
        :selected-y="y"
        @camera="emit('camera', $event)"
        @select="selectTile"
      />
      <UiRow label="Destination tile">
        <UiNumberField v-model="x" label="Destination X" />
        <UiNumberField v-model="y" label="Destination Y" />
        <UiButton @click="usePlayerTile">Use player tile</UiButton>
      </UiRow>
      <div class="flex flex-wrap items-center pb-2 gap-2">
        <UiButton variant="primary" :disabled="!detail.canMove" @click="move('walk')">
          Walk here
        </UiButton>
        <UiButton :disabled="!detail.canMove" @click="move('teleport')"> Teleport here </UiButton>
        <span v-if="!detail.canMove" class="text-dim">Return to the map to move.</span>
      </div>
    </div>
    <p v-else class="py-2 text-dim">No map loaded.</p>
  </UiSection>

  <UiSection title="Map destinations">
    <p class="pb-2 text-dim">Teleport uses the destination tile above.</p>
    <LiveCatalog
      :catalog="detail.catalog"
      :search="search"
      label="Search maps"
      @search="emit('search', $event)"
      @page="emit('page', $event)"
    >
      <template #default="{ row }">
        <UiButton :disabled="!detail.canMove" @click="move('teleport', row.id)">
          Teleport
        </UiButton>
      </template>
    </LiveCatalog>
  </UiSection>
</template>
