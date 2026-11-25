<script setup lang="ts">
import { computed, ref } from 'vue'

import UiButton from '@/ui/UiButton.vue'
import UiCheckbox from '@/ui/UiCheckbox.vue'

import type { FoundGame } from '../api'
import { countLabel } from '../format'

const { games } = defineProps<{ games: FoundGame[] }>()
const emit = defineEmits<{ add: [paths: string[]] }>()

const skipped = ref(new Set<string>())

const chosen = computed(() =>
  games.map((game) => game.path).filter((path) => !skipped.value.has(path)),
)

function setChosen(path: string, isChosen: boolean) {
  if (isChosen) skipped.value.delete(path)
  else skipped.value.add(path)
}
</script>

<template>
  <div
    class="fixed bottom-0 left-0 right-0 top-10 grid place-items-center bg-scrim"
    @keydown.esc="emit('add', [])"
  >
    <section
      role="dialog"
      aria-label="Games found"
      class="pop-body grid max-h-[480px] w-[520px] grid-rows-[auto_minmax(0,1fr)_auto] rounded-window border-outline border-ink bg-paper p-4 shadow-window"
    >
      <h2 class="mb-2 font-display text-[20px] font-extrabold italic">
        {{
          games.length === 0 ? 'No new games found' : `Found ${countLabel(games.length, 'game')}`
        }}
      </h2>
      <div class="overflow-y-auto">
        <p v-if="games.length === 0" class="text-dim">
          Games already in your library are not listed. Try the folder that holds your games.
        </p>
        <div v-for="game in games" :key="game.path" class="border-b-hairline py-1.5">
          <UiCheckbox
            :label="`${game.title} (${game.engine})`"
            :model-value="!skipped.has(game.path)"
            @update:model-value="(value) => setChosen(game.path, value)"
          />
          <p class="truncate pl-[26px] font-mono text-[11px] text-dim" :title="game.path">
            {{ game.path }}
          </p>
        </div>
      </div>
      <div class="mt-3 grid grid-flow-col justify-end gap-2">
        <UiButton @click="emit('add', [])">{{ games.length === 0 ? 'Close' : 'Cancel' }}</UiButton>
        <UiButton
          v-if="games.length > 0"
          variant="primary"
          :disabled="chosen.length === 0"
          @click="emit('add', chosen)"
        >
          Add {{ countLabel(chosen.length, 'game') }}
        </UiButton>
      </div>
    </section>
  </div>
</template>
