<script setup lang="ts">
import { ref, watch } from 'vue'

import type { LiveAction, LiveDetail, LiveMapCamera } from '@/engine/liveProtocol'
import UiButton from '@/ui/UiButton.vue'
import UiNumberField from '@/ui/UiNumberField.vue'
import UiRow from '@/ui/UiRow.vue'

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
  <div class="grid h-full min-h-0 gap-3.5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
    <section
      class="grid min-h-0 content-start overflow-y-auto rounded-control border-hairline bg-panel p-3.5 gap-2.5"
    >
      <div class="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2">
        <h2 class="truncate font-display text-base font-extrabold italic" :title="map">
          {{ map }}
        </h2>
        <span v-if="detail.preview" class="font-mono text-xs text-dim">
          {{ detail.preview.x }}, {{ detail.preview.y }} · {{ detail.preview.width }} ×
          {{ detail.preview.height }}
        </span>
      </div>

      <template v-if="detail.preview">
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
          <UiButton @click="usePlayerTile">Player tile</UiButton>
        </UiRow>
        <div class="flex flex-wrap items-center gap-2">
          <UiButton variant="primary" :disabled="!detail.canMove" @click="move('walk')">
            Walk here
          </UiButton>
          <UiButton :disabled="!detail.canMove" @click="move('teleport')">Teleport here</UiButton>
          <span v-if="!detail.canMove" class="text-xs text-dim">Return to the map to move.</span>
        </div>
      </template>
      <p v-else class="py-2 text-sm text-dim">No map loaded.</p>
    </section>

    <section
      class="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] rounded-control border-hairline bg-panel p-3.5 gap-2"
    >
      <div>
        <h2 class="font-display text-base font-extrabold italic">Map destinations</h2>
        <p class="text-xs text-dim">Teleport uses the destination tile on the left.</p>
      </div>
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
    </section>
  </div>
</template>
