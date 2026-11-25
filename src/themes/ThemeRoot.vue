<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, useTemplateRef, watch } from 'vue'

import { setActiveEffects } from './activeEffects'
import { useSystemMode, type ColorMode } from './colorMode'
import { themeById } from './index'
import { POPUP_LAYER, SHOWN_MODE } from './themeContext'

const props = defineProps<{ themeId: string; colorMode: ColorMode; effects: boolean }>()

const theme = computed(() => themeById(props.themeId))
const activeEffects = computed(() => (props.effects ? theme.value.effects : undefined))
const fxLayer = useTemplateRef('fxLayer')
const popupLayer = useTemplateRef('popupLayer')
const usesKeyboard = ref(false)

const systemMode = useSystemMode()
const shownMode = computed(() => {
  if (!theme.value.hasDarkMode) return 'light'
  return props.colorMode === 'system' ? systemMode.value : props.colorMode
})

provide(POPUP_LAYER, popupLayer)
provide(SHOWN_MODE, shownMode)

let unmountEffects: (() => void) | undefined

watch(activeEffects, setActiveEffects, { immediate: true, flush: 'sync' })

function mountEffects() {
  unmountEffects?.()
  unmountEffects = fxLayer.value ? activeEffects.value?.mount(fxLayer.value) : undefined
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
    :data-mode="shownMode"
    @keydown.capture="onKeyDown"
    @mousedown.capture="onMouseDown"
  >
    <div :key="`${theme.id}-${effects}`">
      <slot />
    </div>
    <div ref="popupLayer" />
    <div ref="fxLayer" aria-hidden="true" />
  </div>
</template>
