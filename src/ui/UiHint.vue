<script setup lang="ts">
import { ref } from 'vue'

import { vFx } from '@/themes/activeEffects'

defineProps<{ text: string }>()

const isShown = ref(false)
</script>

<template>
  <span class="relative" @mouseenter="isShown = true" @mouseleave="isShown = false">
    <button
      type="button"
      class="block h-[15px] w-[15px] rounded-full border-hairline border-ink text-center text-[10px] font-extrabold leading-[12px]"
      :aria-label="text"
      @focus="isShown = true"
      @blur="isShown = false"
    >
      ?
    </button>
    <span
      v-if="isShown"
      v-fx:tooltip
      role="tooltip"
      class="pointer-events-none absolute bottom-[21px] left-[-10px] z-10 w-[180px] rounded-control border-outline border-ink bg-paper px-2 py-1 text-[12px] shadow-control"
    >
      {{ text }}
    </span>
  </span>
</template>
