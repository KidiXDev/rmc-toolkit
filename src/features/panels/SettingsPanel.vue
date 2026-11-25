<script setup lang="ts">
import { EXTRA_IDS, SETTING_LIMITS } from '@/stores/sanitize'
import { useSettings } from '@/stores/settings'
import { THEMES } from '@/themes'
import UiNumberField from '@/ui/UiNumberField.vue'
import UiRow from '@/ui/UiRow.vue'
import UiSection from '@/ui/UiSection.vue'
import UiSelect from '@/ui/UiSelect.vue'
import UiSlider from '@/ui/UiSlider.vue'
import UiToggle from '@/ui/UiToggle.vue'

import { EXTRAS } from '../extras'

const settings = useSettings()

const themeOptions = THEMES.map(({ id, label }) => ({ value: id, label }))
const version = __APP_VERSION__
</script>

<template>
  <UiSection title="Look">
    <UiRow label="Theme">
      <UiSelect v-model="settings.theme" label="Theme" :options="themeOptions" />
    </UiRow>
    <UiRow label="Effects" hint="Bursts, smoke and springy motion.">
      <UiToggle v-model="settings.effects" label="Effects" />
    </UiRow>
    <UiRow label="Window size">
      <UiSlider
        v-model="settings.uiScale"
        label="Window size"
        :min="SETTING_LIMITS.uiScale[0]"
        :max="SETTING_LIMITS.uiScale[1]"
        :step="0.05"
        :digits="2"
        unit="x"
      />
    </UiRow>
    <UiRow label="Corner button" hint="You can always open the window with its shortcut.">
      <UiToggle v-model="settings.badge" label="Corner button" />
    </UiRow>
    <UiRow v-if="settings.badge" label="Corner button opacity">
      <UiSlider
        v-model="settings.badgeOpacity"
        label="Corner button opacity"
        :min="SETTING_LIMITS.badgeOpacity[0]"
        :max="SETTING_LIMITS.badgeOpacity[1]"
        :step="0.1"
        :digits="1"
      />
    </UiRow>
  </UiSection>

  <UiSection title="Quick save">
    <UiRow label="Save slot">
      <UiNumberField
        v-model="settings.saveSlot"
        label="Save slot"
        :min="SETTING_LIMITS.saveSlot[0]"
        :max="SETTING_LIMITS.saveSlot[1]"
      />
    </UiRow>
  </UiSection>

  <UiSection title="Extras">
    <UiRow v-for="id in EXTRA_IDS" :key="id" :label="EXTRAS[id].label" :hint="EXTRAS[id].hint">
      <UiToggle v-model="settings.extras[id]" :label="EXTRAS[id].label" />
    </UiRow>
  </UiSection>

  <p class="text-[11px] text-dim">RMC Toolkit {{ version }}</p>
</template>
