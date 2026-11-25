<script setup lang="ts">
import { computed } from 'vue'

import { gold, maxGold, setGold } from '@/cheats/gold'
import { defaultMoveSpeed, forceEncounter, MOVE_SPEED_RANGE } from '@/cheats/movement'
import { gotoTitle, openLoadScene, openSaveScene, reloadGame } from '@/cheats/scene'
import { SPEED_RANGE } from '@/cheats/speed'
import { refreshLive, useLive } from '@/engine/live'
import { useCheats } from '@/stores/cheats'
import { useOverlay } from '@/stores/overlay'
import { SETTING_LIMITS } from '@/stores/sanitize'
import { useSettings } from '@/stores/settings'
import UiButton from '@/ui/UiButton.vue'
import UiButtonRow from '@/ui/UiButtonRow.vue'
import UiConfirmButton from '@/ui/UiConfirmButton.vue'
import UiNumberField from '@/ui/UiNumberField.vue'
import UiRow from '@/ui/UiRow.vue'
import UiSection from '@/ui/UiSection.vue'
import UiSlider from '@/ui/UiSlider.vue'
import UiToggle from '@/ui/UiToggle.vue'

const cheats = useCheats()
const settings = useSettings()
const overlay = useOverlay()

const [minFastForward, maxFastForward] = SETTING_LIMITS.fastForwardSpeed

const currentGold = useLive(gold, 0)
const goldLimit = useLive(maxGold, 0)
const gameMoveSpeed = useLive(defaultMoveSpeed, 4)

const goldModel = computed({
  get: () => currentGold.value,
  set: changeGold,
})

const moveSpeed = computed({
  get: () => cheats.moveSpeed ?? gameMoveSpeed.value,
  set: (value) => {
    cheats.moveSpeed = value
  },
})

function changeGold(amount: number) {
  setGold(amount)
  refreshLive()
}

function openScene(open: () => boolean, name: string) {
  if (!open()) overlay.notify(`${name} works only on the map`, 'error')
}
</script>

<template>
  <UiSection title="Player">
    <UiRow label="Gold">
      <UiNumberField v-model="goldModel" label="Gold" :max="goldLimit" />
      <UiButton @click="changeGold(goldLimit)">Max</UiButton>
    </UiRow>
    <UiRow label="Move speed">
      <UiSlider
        v-model="moveSpeed"
        label="Move speed"
        :min="MOVE_SPEED_RANGE.min"
        :max="MOVE_SPEED_RANGE.max"
        :step="0.5"
        :digits="1"
      />
      <UiButton :disabled="cheats.moveSpeed === null" @click="cheats.moveSpeed = null">
        Reset
      </UiButton>
    </UiRow>
    <UiRow label="No-clip" hint="Walk through walls and events.">
      <UiToggle v-model="cheats.noClip" label="No-clip" />
    </UiRow>
    <UiRow label="No random encounters">
      <UiToggle v-model="cheats.noEncounters" label="No random encounters" />
      <UiButton @click="forceEncounter">Force one</UiButton>
    </UiRow>
  </UiSection>

  <UiSection title="Game speed">
    <UiRow label="Field">
      <UiSlider
        v-model="cheats.gameSpeed"
        label="Field speed"
        :min="SPEED_RANGE.min"
        :max="SPEED_RANGE.max"
        :step="0.1"
        :digits="1"
        unit="x"
      />
      <UiButton :disabled="cheats.gameSpeed === 1" @click="cheats.gameSpeed = 1">Reset</UiButton>
    </UiRow>
    <UiRow label="Battle">
      <UiSlider
        v-model="cheats.battleSpeed"
        label="Battle speed"
        :min="SPEED_RANGE.min"
        :max="SPEED_RANGE.max"
        :step="0.1"
        :digits="1"
        unit="x"
      />
      <UiButton :disabled="cheats.battleSpeed === 1" @click="cheats.battleSpeed = 1">
        Reset
      </UiButton>
    </UiRow>
    <UiRow label="Fast-forward" hint="Speed while the fast-forward key is held. Also skips text.">
      <UiSlider
        v-model="settings.fastForwardSpeed"
        label="Fast-forward speed"
        :min="minFastForward"
        :max="maxFastForward"
        unit="x"
      />
    </UiRow>
  </UiSection>

  <UiSection title="Scene">
    <UiButtonRow>
      <UiButton @click="openScene(openSaveScene, 'Save')">Save menu</UiButton>
      <UiButton @click="openScene(openLoadScene, 'Load')">Load menu</UiButton>
      <UiConfirmButton @confirm="gotoTitle">Title</UiConfirmButton>
      <UiConfirmButton @confirm="reloadGame">Reload game</UiConfirmButton>
    </UiButtonRow>
  </UiSection>
</template>
