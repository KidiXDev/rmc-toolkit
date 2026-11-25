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
  <ThemeRoot :theme-id="settings.theme" :effects="settings.effects">
    <component :is="feature.overlay" v-for="feature in overlays" :key="feature.id" />
    <button
      v-if="settings.badge && !overlay.isOpen"
      type="button"
      class="pointer-events-auto fixed bottom-3 right-3 rounded-control border-outline border-ink bg-paper px-2 py-0.5 font-display text-[12px] font-extrabold italic shadow-control"
      :style="{ opacity: isBadgeHovered ? 1 : settings.badgeOpacity }"
      aria-label="Open RMC Toolkit"
      @mouseenter="isBadgeHovered = true"
      @mouseleave="isBadgeHovered = false"
      @click="overlay.toggle"
    >
      RMC
    </button>
    <CheatWindow v-if="overlay.isOpen" />
    <div class="pointer-events-none fixed bottom-3 left-3">
      <UiToast
        v-for="toast in overlay.toasts"
        :key="toast.id"
        :message="toast.message"
        :tone="toast.tone"
        @dismiss="overlay.dismissToast(toast.id)"
      />
    </div>
  </ThemeRoot>
</template>
