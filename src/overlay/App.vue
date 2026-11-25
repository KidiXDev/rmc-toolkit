<script setup lang="ts">
import { ref } from 'vue'

import { useFeatures } from '@/features'
import { useOverlay } from '@/stores/overlay'
import { useSettings } from '@/stores/settings'
import ThemeRoot from '@/themes/ThemeRoot.vue'
import UiToast from '@/ui/UiToast.vue'

import CheatWindow from './CheatWindow.vue'

const overlay = useOverlay()
const settings = useSettings()
const { overlays } = useFeatures()

const isBadgeHovered = ref(false)
</script>

<template>
  <ThemeRoot
    :theme-id="settings.theme"
    :color-mode="settings.colorMode"
    :effects="settings.effects"
  >
    <component :is="feature.overlay" v-for="feature in overlays" :key="feature.id" />
    <Transition name="badge">
      <button
        v-if="settings.badge && !overlay.isOpen"
        type="button"
        class="smooth pointer-events-auto fixed bottom-3 right-3 rounded-control border-outline border-ink bg-paper px-2 py-0.5 font-display text-[12px] font-extrabold italic shadow-control hover:bg-panel hover:shadow-hover"
        :style="{ opacity: isBadgeHovered ? 1 : settings.badgeOpacity }"
        aria-label="Open RMC Toolkit"
        @mouseenter="isBadgeHovered = true"
        @mouseleave="isBadgeHovered = false"
        @click="overlay.toggle"
      >
        RMC
      </button>
    </Transition>
    <Transition name="window" :duration="{ enter: 380, leave: 130 }">
      <CheatWindow v-if="overlay.isOpen" />
    </Transition>
    <TransitionGroup name="toast" tag="div" class="pointer-events-none fixed bottom-3 left-3">
      <UiToast
        v-for="toast in overlay.toasts"
        :key="toast.id"
        :message="toast.message"
        :tone="toast.tone"
        @dismiss="overlay.dismissToast(toast.id)"
      />
    </TransitionGroup>
  </ThemeRoot>
</template>
