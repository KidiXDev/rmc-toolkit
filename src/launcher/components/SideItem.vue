<script setup lang="ts">
defineProps<{ active: boolean }>()
</script>

<template>
  <button
    type="button"
    class="smooth w-full rounded-control text-left"
    :class="active ? 'bg-primary text-onfill' : 'text-onchrome hover:bg-chrome-hover'"
    :aria-current="active ? 'page' : undefined"
  >
    <slot />
  </button>
</template>
