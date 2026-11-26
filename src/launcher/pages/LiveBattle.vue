<script setup lang="ts">
import type { BattleResult } from '@/cheats/battle'
import type { LiveAction, LiveDetail } from '@/engine/liveProtocol'
import UiButton from '@/ui/UiButton.vue'
import UiConfirmButton from '@/ui/UiConfirmButton.vue'
import UiNumberField from '@/ui/UiNumberField.vue'
import UiRow from '@/ui/UiRow.vue'

const { detail } = defineProps<{ detail: Extract<LiveDetail, { kind: 'battle' }> }>()
const emit = defineEmits<{ action: [value: LiveAction] }>()

const MULTIPLIER_PRESETS = [1, 2, 5, 10] as const
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

function enemyPercent(hp: number, maxHp: number): string {
  if (maxHp <= 0) return '0%'
  return `${Math.min(100, Math.max(0, Math.round((hp / maxHp) * 100)))}%`
}
</script>

<template>
  <div class="grid h-full min-h-0 gap-3.5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
    <section
      class="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] rounded-control border-hairline bg-panel p-3.5 gap-2.5"
    >
      <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <h2 class="font-display text-base font-extrabold italic">Active battle</h2>
        <UiButton
          v-if="detail.battleId !== null && detail.enemies.length"
          variant="primary"
          @click="weakenEnemies"
        >
          All enemies to 1 HP
        </UiButton>
      </div>

      <p v-if="detail.battleId === null" class="text-sm text-dim">
        Start a battle to control enemies and finish fights instantly.
      </p>

      <div v-else class="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
        <div :key="detail.battleId" class="flex flex-wrap items-center gap-2">
          <UiConfirmButton
            v-for="{ result, label } in RESULTS"
            :key="result"
            @confirm="finishBattle(result)"
          >
            {{ label }}
          </UiConfirmButton>
        </div>

        <div class="grid content-start overflow-y-auto pr-1 gap-2">
          <div
            v-for="enemy in detail.enemies"
            :key="`${detail.battleId}-${enemy.index}`"
            class="grid rounded-control border-hairline bg-paper p-2.5 gap-1.5"
          >
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <span class="truncate font-bold">{{ enemy.name }}</span>
              <span class="font-mono text-xs text-dim">{{ enemy.hp }} / {{ enemy.maxHp }}</span>
            </div>
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <span class="block h-2 overflow-hidden rounded-full bg-track">
                <span
                  class="progress-fill block h-full bg-danger"
                  :style="{ width: enemyPercent(enemy.hp, enemy.maxHp) }"
                />
              </span>
              <UiNumberField
                :label="`${enemy.name} HP`"
                :model-value="enemy.hp"
                :max="enemy.maxHp"
                @update:model-value="setEnemyHp(enemy.index, $event)"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <section
      class="grid min-h-0 content-start overflow-y-auto rounded-control border-hairline bg-panel p-3.5 gap-3"
    >
      <h2 class="font-display text-base font-extrabold italic">Rewards and damage</h2>

      <div class="grid rounded-control border-hairline bg-paper p-3 gap-2">
        <UiRow label="EXP multiplier">
          <UiNumberField
            label="EXP multiplier"
            :model-value="detail.exp"
            :max="100"
            @update:model-value="emit('action', { kind: 'expMultiplier', value: $event })"
          />
          <span>×</span>
        </UiRow>
        <div class="flex flex-wrap items-center gap-1.5">
          <UiButton
            v-for="preset in MULTIPLIER_PRESETS"
            :key="preset"
            :active="detail.exp === preset"
            @click="emit('action', { kind: 'expMultiplier', value: preset })"
          >
            {{ preset }}×
          </UiButton>
        </div>
      </div>

      <div class="grid rounded-control border-hairline bg-paper p-3 gap-2">
        <UiRow label="Party damage">
          <UiNumberField
            label="Party damage multiplier"
            :model-value="detail.damage"
            :max="100"
            @update:model-value="emit('action', { kind: 'damageMultiplier', value: $event })"
          />
          <span>×</span>
        </UiRow>
        <div class="flex flex-wrap items-center gap-1.5">
          <UiButton
            v-for="preset in MULTIPLIER_PRESETS"
            :key="preset"
            :active="detail.damage === preset"
            @click="emit('action', { kind: 'damageMultiplier', value: preset })"
          >
            {{ preset }}×
          </UiButton>
        </div>
      </div>
    </section>
  </div>
</template>
