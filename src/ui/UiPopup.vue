<script setup lang="ts">
import { nextTick, onBeforeUnmount, reactive, useTemplateRef, watch } from 'vue'

import { usePopupLayer } from '@/themes/themeContext'

const {
  anchor,
  open,
  prefer = 'below',
  motion = 'pop',
  matchWidth = false,
} = defineProps<{
  anchor: HTMLElement | null
  open: boolean
  prefer?: 'above' | 'below'
  motion?: 'pop' | 'fade'
  matchWidth?: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const GAP_PX = 5
const EDGE_PX = 8
const DURATION = { enter: 320, leave: 130 }

const layer = usePopupLayer()
const popup = useTemplateRef('popup')
const place = reactive({ left: 0, top: 0, scale: 1, minWidth: 0, isAbove: false })

function choosePlace(anchorBox: DOMRect, height: number) {
  const below = anchorBox.bottom + GAP_PX
  const above = anchorBox.top - GAP_PX - height
  const fitsBelow = below + height <= window.innerHeight - EDGE_PX
  const fitsAbove = above >= EDGE_PX
  const isAbove = prefer === 'above' ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove
  return { isAbove, top: Math.max(EDGE_PX, isAbove ? above : below) }
}

function position() {
  if (!popup.value || !anchor) return
  const anchorBox = anchor.getBoundingClientRect()
  const scale = anchor.offsetWidth === 0 ? 1 : anchorBox.width / anchor.offsetWidth
  const rightmost = window.innerWidth - EDGE_PX - popup.value.offsetWidth * scale

  Object.assign(place, choosePlace(anchorBox, popup.value.offsetHeight * scale), {
    scale,
    minWidth: matchWidth ? anchor.offsetWidth : 0,
    left: Math.max(EDGE_PX, Math.min(anchorBox.left, rightmost)),
  })
}

function closeFromOutside(event: Event) {
  const path = event.composedPath()
  const isInside = [anchor, popup.value].some((element) => element && path.includes(element))
  if (!isInside) emit('close')
}

const close = () => emit('close')

function listen() {
  window.addEventListener('pointerdown', closeFromOutside, true)
  window.addEventListener('scroll', closeFromOutside, true)
  window.addEventListener('resize', close)
  window.addEventListener('blur', close)
}

function stopListening() {
  window.removeEventListener('pointerdown', closeFromOutside, true)
  window.removeEventListener('scroll', closeFromOutside, true)
  window.removeEventListener('resize', close)
  window.removeEventListener('blur', close)
}

watch(
  () => open,
  async (isOpen) => {
    stopListening()
    if (!isOpen) return
    listen()
    await nextTick()
    position()
  },
)

onBeforeUnmount(stopListening)
</script>

<template>
  <Teleport v-if="layer" :to="layer">
    <Transition :name="motion" :duration="DURATION">
      <div
        v-if="open"
        ref="popup"
        class="pointer-events-auto fixed left-0 top-0"
        :style="{
          transform: `translate(${place.left}px, ${place.top}px) scale(${place.scale})`,
          transformOrigin: '0 0',
          minWidth: `${place.minWidth}px`,
        }"
      >
        <div class="pop-body" :style="{ transformOrigin: place.isAbove ? '50% 100%' : '50% 0' }">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
