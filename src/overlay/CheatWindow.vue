<script setup lang="ts">
import { computed, nextTick, useTemplateRef } from 'vue'

import { useFeatures } from '@/features'
import { useOverlay } from '@/stores/overlay'
import { useSettings } from '@/stores/settings'
import { vFx } from '@/themes/activeEffects'

import { useDrag } from './useDrag'
import { clampToViewport, useViewport } from './useViewport'

const WIDTH = 540
const HEIGHT = 470

const STEP_BY_KEY: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 }

const overlay = useOverlay()
const settings = useSettings()
const viewport = useViewport()
const { tabs } = useFeatures()

const tabList = useTemplateRef('tabList')

const active = computed(
  () => tabs.value.find((tab) => tab.id === overlay.activeTab) ?? tabs.value[0],
)

const scale = computed(() =>
  Math.min(settings.uiScale, viewport.width / WIDTH, viewport.height / HEIGHT),
)

const position = computed(() => ({
  x: clampToViewport(settings.windowX, WIDTH * scale.value, viewport.width),
  y: clampToViewport(settings.windowY, HEIGHT * scale.value, viewport.height),
}))

const { handlers } = useDrag({
  position: () => position.value,
  onMove: ({ x, y }) => {
    settings.windowX = clampToViewport(x, WIDTH * scale.value, viewport.width)
    settings.windowY = clampToViewport(y, HEIGHT * scale.value, viewport.height)
  },
})

async function moveTab(event: KeyboardEvent) {
  const step = STEP_BY_KEY[event.key]
  if (!step) return
  event.preventDefault()

  const index = tabs.value.findIndex((tab) => tab.id === active.value?.id)
  const next = tabs.value[(index + step + tabs.value.length) % tabs.value.length]
  if (!next) return

  overlay.activeTab = next.id
  await nextTick()
  tabList.value?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus()
}
</script>

<template>
  <div
    class="pointer-events-auto fixed left-0 top-0"
    :style="{
      width: `${WIDTH}px`,
      height: `${HEIGHT}px`,
      transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
      transformOrigin: '0 0',
    }"
    role="dialog"
    aria-label="RMC Toolkit"
  >
    <div
      class="window-body grid h-full grid-rows-[auto_minmax(0,1fr)] rounded-window border-outline border-ink bg-paper shadow-window"
    >
      <header
        class="grid cursor-move touch-none select-none grid-cols-[1fr_auto] items-center border-b-outline border-ink px-3 py-1"
        v-on="handlers"
      >
        <span class="font-display text-[15px] font-extrabold italic">RMC Toolkit</span>
        <button
          type="button"
          class="smooth px-1 font-extrabold hover:text-accent"
          aria-label="Close"
          @pointerdown.stop
          @click="overlay.isOpen = false"
        >
          ✕
        </button>
      </header>
      <div class="grid min-h-0 grid-cols-[104px_minmax(0,1fr)]">
        <div
          ref="tabList"
          v-fx:tabs
          role="tablist"
          aria-orientation="vertical"
          aria-label="Cheats"
          class="relative overflow-y-auto border-r-outline border-ink py-1.5"
          @keydown="moveTab"
        >
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            role="tab"
            class="smooth relative block w-full px-3 py-1 text-left"
            :class="tab === active ? 'bg-soft font-extrabold' : 'font-semibold hover:bg-panel'"
            :aria-selected="tab === active"
            :tabindex="tab === active ? 0 : -1"
            @click="overlay.activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="overflow-y-auto px-3 py-2" role="tabpanel" :aria-label="active?.label">
          <div :key="active?.id" class="panel-in"><component :is="active?.panel" /></div>
        </div>
      </div>
    </div>
  </div>
</template>
