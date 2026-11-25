<script setup lang="ts">
import type { BattleResult } from '@/cheats/battle'
import type { LiveAction, LiveDetail } from '@/engine/liveProtocol'
import UiButton from '@/ui/UiButton.vue'
import UiConfirmButton from '@/ui/UiConfirmButton.vue'
import UiNumberField from '@/ui/UiNumberField.vue'
import UiRow from '@/ui/UiRow.vue'
import UiSection from '@/ui/UiSection.vue'

const { detail } = defineProps<{ detail: Extract<LiveDetail, { kind: 'battle' }> }>()
const emit = defineEmits<{ action: [value: LiveAction] }>()

const RESULTS: Array<{ result: BattleResult; label: string }> = [
  { result: 'victory', label: 'Win' },
  { result: 'defeat', label: 'Lose' },
  { result: 'escape', label: 'Escape' },
  { result: 'abort', label: 'Abort' },
]

function setEnemyHp(index: number, value: number) {
  if (detail.battleId !== null)
    emit('action', { kind: 'enemyHp', battleId: detail.battleId, index, value })
}

function finishBattle(result: BattleResult) {
  if (detail.battleId !== null)
    emit('action', { kind: 'battleResult', battleId: detail.battleId, result })
}

function weakenEnemies() {
  if (detail.battleId !== null) emit('action', { kind: 'weakenEnemies', battleId: detail.battleId })
}
</script>

<template>
  <UiSection title="Battle">
    <p v-if="detail.battleId === null" class="py-2 text-dim">
      Start a battle to control enemies and results.
    </p>
    <template v-else>
      <div :key="detail.battleId" class="flex flex-wrap items-center py-2 gap-2">
        <UiConfirmButton
          v-for="{ result, label } in RESULTS"
          :key="result"
          @confirm="finishBattle(result)"
        >
          {{ label }}
        </UiConfirmButton>
      </div>
      <UiRow
        v-for="enemy in detail.enemies"
        :key="`${detail.battleId}-${enemy.index}`"
        :label="enemy.name"
      >
        <UiNumberField
          :label="`${enemy.name} HP`"
          :model-value="enemy.hp"
          :max="enemy.maxHp"
          @update:model-value="setEnemyHp(enemy.index, $event)"
        />
        <span class="w-14 font-mono text-[12px] text-dim">/ {{ enemy.maxHp }}</span>
      </UiRow>
      <UiButton v-if="detail.enemies.length" class="my-2" @click="weakenEnemies">
        All enemies to 1 HP
      </UiButton>
    </template>
  </UiSection>
  <UiSection title="Rewards and damage">
    <UiRow label="EXP multiplier">
      <UiNumberField
        label="EXP multiplier"
        :model-value="detail.exp"
        :max="100"
        @update:model-value="emit('action', { kind: 'expMultiplier', value: $event })"
      />
      <span>×</span>
      <UiButton
        :disabled="detail.exp === 1"
        @click="emit('action', { kind: 'expMultiplier', value: 1 })"
      >
        Reset
      </UiButton>
    </UiRow>
    <UiRow label="Party damage multiplier">
      <UiNumberField
        label="Party damage multiplier"
        :model-value="detail.damage"
        :max="100"
        @update:model-value="emit('action', { kind: 'damageMultiplier', value: $event })"
      />
      <span>×</span>
      <UiButton
        :disabled="detail.damage === 1"
        @click="emit('action', { kind: 'damageMultiplier', value: 1 })"
      >
        Reset
      </UiButton>
    </UiRow>
  </UiSection>
</template>
