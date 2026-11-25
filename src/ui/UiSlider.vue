<script setup lang="ts">
import { computed } from 'vue'

import { vFx } from '@/themes/activeEffects'

const {
  min,
  max,
  step = 1,
  unit = '',
  digits = 0,
} = defineProps<{
  label: string
  min: number
  max: number
  step?: number
  unit?: string
  digits?: number
}>()

const model = defineModel<number>({ required: true })

const fraction = computed(() => {
  const ratio = (model.value - min) / (max - min)
  return Math.min(1, Math.max(0, ratio))
})

function onInput(event: Event) {
  if (event.target instanceof HTMLInputElement) model.value = event.target.valueAsNumber
}

function releaseFocus(event: Event) {
  if (event.target instanceof HTMLInputElement) event.target.blur()
}
</script>

<template>
  <div class="grid grid-cols-[130px_46px] items-center gap-2">
    <div v-fx:slider class="relative h-[18px]" :style="{ '--value': fraction }">
      <div
        class="absolute left-0 right-0 top-[4px] h-[10px] overflow-hidden rounded-full border-outline border-ink bg-paper"
      >
        <i class="block h-full bg-primary" style="width: calc(var(--lag, var(--value)) * 100%)" />
      </div>
      <span
        data-fx-part="thumb"
        class="absolute top-0 h-[18px] w-[18px] rounded-full border-outline border-ink bg-paper"
        style="left: calc(var(--lag, var(--value)) * (100% - 18px))"
      />
      <input
        type="range"
        class="absolute left-0 top-0 h-full w-full cursor-pointer opacity-0"
        :min="min"
        :max="max"
        :step="step"
        :value="model"
        :aria-label="label"
        @input="onInput"
        @pointerup="releaseFocus"
      />
    </div>
    <span class="text-right font-mono text-[12px]">{{ model.toFixed(digits) }}{{ unit }}</span>
  </div>
</template>
