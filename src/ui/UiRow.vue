<script setup lang="ts">
import UiHint from './UiHint.vue'

defineProps<{ label: string; hint?: string }>()
</script>

<template>
  <div class="grid min-h-[31px] grid-cols-[1fr_auto] items-center gap-3">
    <span class="grid grid-flow-col items-center justify-start gap-1.5">
      {{ label }}
      <UiHint v-if="hint" :text="hint" />
    </span>
    <div class="grid grid-flow-col items-center gap-1.5">
      <slot />
    </div>
  </div>
</template>
