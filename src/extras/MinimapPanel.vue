<script setup lang="ts">
import { useLive } from '@/engine/live'
import { currentMapLabel } from '@/engine/runtime'
import { defaultSettings, SETTING_LIMITS } from '@/stores/sanitize'
import { useSettings } from '@/stores/settings'
import UiButton from '@/ui/UiButton.vue'
import UiRow from '@/ui/UiRow.vue'
import UiSection from '@/ui/UiSection.vue'
import UiSlider from '@/ui/UiSlider.vue'
import UiToggle from '@/ui/UiToggle.vue'

import MapCanvas from './MapCanvas.vue'

const settings = useSettings()
const mapLabel = useLive(currentMapLabel, '')

function resetPosition() {
  const { minimapX, minimapY } = defaultSettings()
  Object.assign(settings, { minimapX, minimapY })
}
</script>

<template>
  <UiSection :title="mapLabel">
    <div class="mt-1.5 overflow-hidden rounded-control border-outline border-ink">
      <MapCanvas class="w-full" :width="390" :height="250" zoom="fit" />
    </div>
  </UiSection>
  <UiSection title="Minimap">
    <UiRow label="Click teleports" hint="When off, clicking walks there instead.">
      <UiToggle v-model="settings.minimapTeleport" label="Click teleports" />
    </UiRow>
    <UiRow label="Opacity">
      <UiSlider
        v-model="settings.minimapOpacity"
        label="Minimap opacity"
        :min="SETTING_LIMITS.minimapOpacity[0]"
        :max="SETTING_LIMITS.minimapOpacity[1]"
        :step="0.05"
        :digits="2"
      />
    </UiRow>
    <UiRow label="Position">
      <UiButton @click="resetPosition">Reset</UiButton>
    </UiRow>
  </UiSection>
</template>
