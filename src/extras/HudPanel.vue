<script setup lang="ts">
import { HUD_CORNERS, type HudCorner } from '@/stores/sanitize'
import { useSettings } from '@/stores/settings'
import UiRow from '@/ui/UiRow.vue'
import UiSection from '@/ui/UiSection.vue'
import UiSelect from '@/ui/UiSelect.vue'
import UiToggle from '@/ui/UiToggle.vue'

const CORNER_LABELS: Record<HudCorner, string> = {
  'top-left': 'Top left',
  'top-right': 'Top right',
  'bottom-left': 'Bottom left',
  'bottom-right': 'Bottom right',
}

const settings = useSettings()
const cornerOptions = HUD_CORNERS.map((value) => ({ value, label: CORNER_LABELS[value] }))
</script>

<template>
  <UiSection title="HUD">
    <UiRow label="Corner">
      <UiSelect v-model="settings.hudCorner" label="Corner" :options="cornerOptions" />
    </UiRow>
    <UiRow label="FPS"><UiToggle v-model="settings.hudFps" label="FPS" /></UiRow>
    <UiRow label="Map name"><UiToggle v-model="settings.hudMap" label="Map name" /></UiRow>
    <UiRow label="Position"><UiToggle v-model="settings.hudPosition" label="Position" /></UiRow>
  </UiSection>
</template>
