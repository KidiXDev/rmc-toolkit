<script setup lang="ts">
import { refreshLive, useLive } from '@/engine/live'
import { useOverlay } from '@/stores/overlay'
import UiButton from '@/ui/UiButton.vue'
import UiConfirmButton from '@/ui/UiConfirmButton.vue'
import UiDataTable from '@/ui/UiDataTable.vue'

import { eraseEvent, mapEventEntries, SELF_SWITCHES, setSelfSwitch, startEvent } from './mapEvents'

const overlay = useOverlay()
const events = useLive(mapEventEntries, [])

function start(id: number) {
  if (!startEvent(id)) overlay.notify('This event cannot start now', 'error')
}

function apply(change: () => void) {
  change()
  refreshLive()
}
</script>

<template>
  <UiDataTable v-slot="{ row }" :rows="events">
    <div
      class="grid grid-flow-col items-center pr-1.5 gap-1"
      :title="`${row.triggerLabel} at ${row.x}, ${row.y}`"
    >
      <button
        v-for="letter in SELF_SWITCHES"
        :key="letter"
        type="button"
        class="h-[18px] w-[18px] rounded-[5px] border-hairline border-ink text-center text-[10px] font-bold"
        :class="row.selfSwitches[letter] ? 'bg-primary' : 'bg-paper'"
        :aria-pressed="row.selfSwitches[letter]"
        :aria-label="`Self switch ${letter} of ${row.name}`"
        @click="apply(() => setSelfSwitch(row.id, letter, !row.selfSwitches[letter]))"
      >
        {{ letter }}
      </button>
      <UiButton :disabled="row.trigger === null" @click="start(row.id)">Start</UiButton>
      <UiConfirmButton @confirm="apply(() => eraseEvent(row.id))">Erase</UiConfirmButton>
    </div>
  </UiDataTable>
</template>
