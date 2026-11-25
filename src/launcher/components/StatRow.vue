<script setup lang="ts">
defineProps<{ stats: Array<{ label: string; value: string }> }>()
</script>

<template>
  <dl class="m-0 flex flex-wrap gap-x-8 gap-y-2">
    <div v-for="stat in stats" :key="stat.label">
      <dt class="text-[12px] text-dim">{{ stat.label }}</dt>
      <dd class="m-0 font-display text-[20px] font-extrabold italic leading-tight">
        {{ stat.value }}
      </dd>
    </div>
  </dl>
</template>
