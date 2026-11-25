<script setup lang="ts">
import { vFx } from '@/themes/activeEffects'

defineProps<{ label: string; disabled?: boolean }>()
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <button
    v-fx:toggle
    type="button"
    role="switch"
    class="relative block h-[18px] w-9 rounded-full"
    :aria-checked="model"
    :aria-label="label"
    :disabled="disabled"
    @click="model = !model"
  >
    <span
      data-fx-part="switch"
      class="block h-full w-full rounded-full border-outline border-ink"
      :class="model ? 'bg-primary' : 'bg-track'"
    >
      <span
        class="absolute left-0 top-0 h-[18px] w-[18px] rounded-full border-outline border-ink bg-paper transition-transform"
        :class="model && 'translate-x-[18px]'"
      />
    </span>
  </button>
</template>
