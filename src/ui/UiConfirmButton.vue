<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

import UiButton from './UiButton.vue'

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
  <UiButton :class="isArmed && 'border-danger text-danger'" @click="press">
    <template v-if="isArmed">Sure?</template>
    <slot v-else />
  </UiButton>
</template>
