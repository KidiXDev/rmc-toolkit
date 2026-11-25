<script setup lang="ts" generic="T extends string | number">
defineProps<{ label: string; options: Array<{ value: T; label: string }> }>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <select
    v-model="model"
    class="w-32 rounded-control border-outline border-ink bg-paper px-1.5 py-0.5 text-[13px]"
    :aria-label="label"
  >
    <option v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label }}
    </option>
  </select>
</template>
