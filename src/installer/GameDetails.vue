<script setup lang="ts">
import { ref } from 'vue'

import UiButton from '@/ui/UiButton.vue'
import UiCheckbox from '@/ui/UiCheckbox.vue'

import type { GameInfo } from './api'
import { statusLabel } from './status'

defineProps<{ game: GameInfo; isBusy: boolean }>()
const emit = defineEmits<{ install: []; uninstall: [removeSettings: boolean] }>()

const removeSettings = ref(false)
</script>

<template>
  <section class="mt-3 rounded-control border-outline border-ink p-3">
    <h2 class="font-display text-[18px] font-extrabold italic">{{ game.title }}</h2>
    <p class="text-dim">RPG Maker {{ game.engine }}, {{ statusLabel(game) }}</p>
    <p class="mb-2 truncate font-mono text-[12px] text-dim" :title="game.path">{{ game.path }}</p>
    <div class="grid grid-flow-col items-center justify-start gap-3">
      <UiButton
        v-if="game.status !== 'current'"
        variant="primary"
        :disabled="isBusy"
        @click="emit('install')"
      >
        {{ game.status === 'outdated' ? 'Update' : 'Install' }}
      </UiButton>
      <template v-if="game.status !== 'notInstalled'">
        <UiButton variant="danger" :disabled="isBusy" @click="emit('uninstall', removeSettings)">
          Uninstall
        </UiButton>
        <UiCheckbox v-model="removeSettings" label="Also remove cheat settings" />
      </template>
    </div>
  </section>
</template>
