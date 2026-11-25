<script setup lang="ts">
import { THEMES } from '@/themes'
import UiRow from '@/ui/UiRow.vue'
import UiSection from '@/ui/UiSection.vue'
import UiSelect from '@/ui/UiSelect.vue'
import UiToggle from '@/ui/UiToggle.vue'

import { useLibrary } from '../library'
import { usePreferences } from '../preferences'

const library = useLibrary()
const preferences = usePreferences()

const themeOptions = THEMES.map(({ id, label }) => ({ value: id, label }))
</script>

<template>
  <div class="h-full overflow-y-auto px-5 py-4">
    <div class="max-w-[560px]">
      <h1 class="mb-3 font-display text-[26px] font-extrabold italic leading-none">Settings</h1>

      <UiSection title="Playing">
        <UiRow
          label="Back up saves before playing"
          hint="Only when they changed. The newest 20 automatic backups are kept."
        >
          <UiToggle v-model="preferences.backupBeforePlay" label="Back up saves before playing" />
        </UiRow>
        <UiRow label="Minimize when a game starts">
          <UiToggle v-model="preferences.minimizeOnPlay" label="Minimize when a game starts" />
        </UiRow>
      </UiSection>

      <UiSection title="Adding games">
        <UiRow label="Install cheats right away">
          <UiToggle v-model="preferences.installOnAdd" label="Install cheats right away" />
        </UiRow>
      </UiSection>

      <UiSection title="Look">
        <UiRow label="Theme">
          <UiSelect v-model="preferences.theme" label="Theme" :options="themeOptions" />
        </UiRow>
        <UiRow label="Effects" hint="Bursts, smoke and springy motion.">
          <UiToggle v-model="preferences.effects" label="Effects" />
        </UiRow>
      </UiSection>

      <p class="text-[12px] text-dim">RMC Toolkit {{ library.version }}</p>
    </div>
  </div>
</template>
