<script setup lang="ts">
import { vFx } from '@/themes/activeEffects'

defineProps<{ label: string }>()
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <button
    v-fx:checkbox
    type="button"
    role="checkbox"
    class="group text-left"
    :aria-checked="model"
    @click="model = !model"
  >
    <span class="grid grid-flow-col items-center justify-start gap-2">
      <span
        data-fx-part="box"
        class="smooth grid h-[18px] w-[18px] place-items-center rounded-[5px] border-outline border-ink bg-paper shadow-control group-hover:bg-panel"
      >
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          class="h-3 w-3 fill-none stroke-ink"
          stroke-width="4.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path v-if="model" class="fx-tick" d="M3.5 10.5l4.5 4.5 8.5-10" />
        </svg>
      </span>
      {{ label }}
    </span>
  </button>
</template>
