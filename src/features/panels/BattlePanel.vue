<script setup lang="ts">
import {
  enemySnapshots,
  forceBattleResult,
  setEnemyHp,
  weakenEnemies,
  type BattleResult,
} from '@/cheats/battle'
import { recoverParty, woundParty } from '@/cheats/party'
import { refreshLive, useLive } from '@/engine/live'
import { isInBattle } from '@/engine/runtime'
import { useCheats } from '@/stores/cheats'
import UiButton from '@/ui/UiButton.vue'
import UiButtonRow from '@/ui/UiButtonRow.vue'
import UiNumberField from '@/ui/UiNumberField.vue'
import UiRow from '@/ui/UiRow.vue'
import UiSection from '@/ui/UiSection.vue'
import UiSlider from '@/ui/UiSlider.vue'

const RESULTS: Array<{ value: BattleResult; label: string }> = [
  { value: 'victory', label: 'Win' },
  { value: 'defeat', label: 'Lose' },
  { value: 'escape', label: 'Escape' },
  { value: 'abort', label: 'Abort' },
]

const cheats = useCheats()
const inBattle = useLive(isInBattle, false)
const enemies = useLive(enemySnapshots, [])

function apply(change: () => void) {
  change()
  refreshLive()
}
</script>

<template>
  <UiSection title="Multipliers">
    <UiRow label="EXP gained">
      <UiSlider
        v-model="cheats.expMultiplier"
        label="EXP multiplier"
        :min="0"
        :max="100"
        unit="x"
      />
      <UiButton :disabled="cheats.expMultiplier === 1" @click="cheats.expMultiplier = 1">
        Reset
      </UiButton>
    </UiRow>
    <UiRow label="Party damage" hint="Enemy damage stays the same.">
      <UiSlider
        v-model="cheats.damageMultiplier"
        label="Damage multiplier"
        :min="0"
        :max="100"
        unit="x"
      />
      <UiButton :disabled="cheats.damageMultiplier === 1" @click="cheats.damageMultiplier = 1">
        Reset
      </UiButton>
    </UiRow>
  </UiSection>

  <UiSection title="Party">
    <UiButtonRow>
      <UiButton variant="primary" @click="apply(recoverParty)">Recover all</UiButton>
      <UiButton @click="apply(woundParty)">Wound all</UiButton>
    </UiButtonRow>
  </UiSection>

  <UiSection title="Battle result">
    <UiButtonRow>
      <UiButton
        v-for="result in RESULTS"
        :key="result.value"
        :disabled="!inBattle"
        @click="apply(() => forceBattleResult(result.value))"
      >
        {{ result.label }}
      </UiButton>
    </UiButtonRow>
  </UiSection>

  <UiSection title="Enemies">
    <p v-if="enemies.length === 0" class="py-1 text-dim">Not in battle.</p>
    <UiRow v-for="enemy in enemies" :key="enemy.index" :label="enemy.name">
      <UiNumberField
        :label="`${enemy.name} HP`"
        :model-value="enemy.hp"
        :max="enemy.maxHp"
        @update:model-value="(value) => apply(() => setEnemyHp(enemy.index, value))"
      />
      <span class="w-14 font-mono text-[12px] text-dim">/ {{ enemy.maxHp }}</span>
    </UiRow>
    <UiButtonRow v-if="enemies.length > 0">
      <UiButton @click="apply(weakenEnemies)">All to 1 HP</UiButton>
    </UiButtonRow>
  </UiSection>
</template>
