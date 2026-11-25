<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <section class="mb-3">
    <h2 class="mb-1 border-b-hairline font-display text-[14px] font-extrabold italic">
      {{ title }}
    </h2>
    <slot />
  </section>
</template>
