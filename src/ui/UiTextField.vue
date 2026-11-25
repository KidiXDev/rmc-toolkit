<script setup lang="ts">
import { vFx } from '@/themes/activeEffects'

defineProps<{ label: string; placeholder?: string }>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <input
    v-model="model"
    v-fx:input
    type="text"
    class="w-full rounded-control border-outline border-ink bg-paper px-2 py-0.5 text-[13px]"
    :placeholder="placeholder"
    :aria-label="label"
    spellcheck="false"
  />
</template>
