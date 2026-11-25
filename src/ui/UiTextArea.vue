<script setup lang="ts">
import { ref, watch } from 'vue'

const { value } = defineProps<{ label: string; value: string; placeholder?: string }>()
const emit = defineEmits<{ commit: [text: string] }>()

const draft = ref(value)

watch(
  () => value,
  (text) => {
    draft.value = text
  },
)

function commit() {
  if (draft.value !== value) emit('commit', draft.value)
}
</script>

<template>
  <textarea
    v-model="draft"
    rows="4"
    class="smooth block w-full select-text resize-y rounded-control border-outline border-ink bg-paper px-2 py-1 text-[13px] text-ink hover:bg-panel focus:border-accent focus:bg-paper"
    :aria-label="label"
    :placeholder="placeholder"
    @blur="commit"
  />
</template>
