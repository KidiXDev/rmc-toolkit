<script setup lang="ts">
defineProps<{ active: boolean }>()
</script>

<template>
  <button
    type="button"
    class="block w-full rounded-control text-left"
    :class="
      active
        ? 'bg-primary text-onfill hover:bg-primary-hover'
        : 'bg-transparent text-onchrome hover:bg-chrome-hover'
    "
    :aria-current="active ? 'page' : undefined"
  >
    <slot />
  </button>
</template>
