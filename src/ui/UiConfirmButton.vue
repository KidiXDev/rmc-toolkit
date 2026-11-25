<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

import { vFx } from '@/themes/activeEffects'

const CONFIRM_WINDOW_MS = 2500

const emit = defineEmits<{ confirm: [] }>()

const isArmed = ref(false)
let timer: number | undefined

function disarm() {
  window.clearTimeout(timer)
  isArmed.value = false
}

function press() {
  if (isArmed.value) {
    disarm()
    emit('confirm')
    return
  }
  isArmed.value = true
  timer = window.setTimeout(disarm, CONFIRM_WINDOW_MS)
}

onBeforeUnmount(disarm)
</script>

<template>
  <button
    v-fx:button
    type="button"
    class="smooth whitespace-nowrap rounded-control border-outline px-2.5 py-0.5 font-display text-[13px] font-extrabold italic shadow-control enabled:hover:shadow-hover"
    :class="
      isArmed
        ? 'fx-shake border-danger bg-danger text-paper'
        : 'border-ink bg-paper enabled:hover:bg-panel'
    "
    @click="press"
  >
    <template v-if="isArmed">Sure?</template>
    <slot v-else />
  </button>
</template>
