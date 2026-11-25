<script setup lang="ts">
import { computed, ref } from 'vue'

import { vFx } from '@/themes/activeEffects'

const { value } = defineProps<{ label: string; value: string }>()
const emit = defineEmits<{ commit: [text: string] }>()

const draft = ref<string | null>(null)
const shown = computed(() => draft.value ?? value)

function onInput(event: Event) {
  if (event.target instanceof HTMLInputElement) draft.value = event.target.value
}

function commit() {
  const text = draft.value
  draft.value = null
  if (text !== null && text !== value) emit('commit', text)
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
    type="text"
    class="w-28 rounded-control border-outline border-ink bg-paper px-2 py-0.5 text-right font-mono text-[12px]"
    :value="shown"
    :aria-label="label"
    spellcheck="false"
    @input="onInput"
    @blur="commit"
    @keydown.enter="onEnter"
    @keydown.esc="revert"
  />
</template>
