<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

import { vFx } from '@/themes/activeEffects'

import UiPopup from './UiPopup.vue'

defineProps<{ text: string }>()

const anchor = useTemplateRef('anchor')
const isShown = ref(false)
</script>

<template>
  <button
    ref="anchor"
    type="button"
    class="smooth block h-[15px] w-[15px] cursor-help rounded-full border-hairline border-ink text-center text-[10px] font-extrabold leading-[12px] hover:bg-soft"
    :aria-label="text"
    @mouseenter="isShown = true"
    @mouseleave="isShown = false"
    @focus="isShown = true"
    @blur="isShown = false"
  >
    ?
  </button>
  <UiPopup :anchor="anchor" :open="isShown" prefer="above" motion="fade" @close="isShown = false">
    <span
      v-fx:tooltip
      role="tooltip"
      class="pointer-events-none block w-[190px] rounded-control border-outline border-ink bg-paper px-2 py-1 text-[12px] shadow-control"
    >
      {{ text }}
    </span>
  </UiPopup>
</template>
