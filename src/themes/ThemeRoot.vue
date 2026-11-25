<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'

import { setActiveEffects } from './activeEffects'
import { themeById } from './index'

const props = defineProps<{ themeId: string; effects: boolean }>()

const theme = computed(() => themeById(props.themeId))
const activeEffects = computed(() => (props.effects ? theme.value.effects : undefined))
const layer = useTemplateRef('layer')
const usesKeyboard = ref(false)

let unmountEffects: (() => void) | undefined

watch(activeEffects, setActiveEffects, { immediate: true, flush: 'sync' })

function mountEffects() {
  unmountEffects?.()
  unmountEffects = layer.value ? activeEffects.value?.mount(layer.value) : undefined
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Tab') usesKeyboard.value = true
}

function onMouseDown() {
  usesKeyboard.value = false
}

onMounted(mountEffects)
watch(activeEffects, mountEffects)
onBeforeUnmount(() => unmountEffects?.())
</script>

<template>
  <div
    class="rmc-root"
    :class="{ 'rmc-keyboard': usesKeyboard }"
    :data-theme="theme.id"
    @keydown.capture="onKeyDown"
    @mousedown.capture="onMouseDown"
  >
    <div :key="`${theme.id}-${effects}`">
      <slot />
    </div>
    <div ref="layer" aria-hidden="true" />
  </div>
</template>
