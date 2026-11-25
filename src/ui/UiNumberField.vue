<script setup lang="ts">
import { computed, ref } from 'vue'

import { vFx } from '@/themes/activeEffects'

const { min = 0, max = Number.MAX_SAFE_INTEGER } = defineProps<{
  label: string
  min?: number
  max?: number
}>()

const model = defineModel<number>({ required: true })

const draft = ref<string | null>(null)
const shown = computed(() => draft.value ?? String(model.value))

function onInput(event: Event) {
  if (event.target instanceof HTMLInputElement) draft.value = event.target.value
}

function commit() {
  const text = draft.value?.trim()
  draft.value = null
  if (!text) return

  const value = Math.round(Number(text))
  if (Number.isFinite(value)) model.value = Math.min(max, Math.max(min, value))
}

function onEnter(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement) event.target.blur()
}

function revert() {
  draft.value = null
}
</script>

<template>
  <input
    v-fx:input
    type="number"
    class="w-24 rounded-control border-outline border-ink bg-paper px-2 py-0.5 text-right font-mono text-[12px]"
    :min="min"
    :max="max"
    :value="shown"
    :aria-label="label"
    @input="onInput"
    @blur="commit"
    @keydown.enter="onEnter"
    @keydown.esc="revert"
  />
</template>
