<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  addMember,
  maxLevel,
  maxParams,
  PARAM_LABELS,
  partySnapshots,
  recoverActor,
  recoverParty,
  removeMember,
  rosterEntries,
  setExp,
  setGodMode,
  setHp,
  setLevel,
  setMp,
  setParam,
  setPartyGodMode,
  setTp,
} from '@/cheats/party'
import { refreshLive, useLive } from '@/engine/live'
import { useCheats } from '@/stores/cheats'
import { useOverlay } from '@/stores/overlay'
import UiButton from '@/ui/UiButton.vue'
import UiButtonRow from '@/ui/UiButtonRow.vue'
import UiNumberField from '@/ui/UiNumberField.vue'
import UiRow from '@/ui/UiRow.vue'
import UiSection from '@/ui/UiSection.vue'
import UiSelect from '@/ui/UiSelect.vue'
import UiToggle from '@/ui/UiToggle.vue'

const MAX_PARAM_INPUT = 999_999

const cheats = useCheats()
const overlay = useOverlay()

const members = useLive(partySnapshots, [])
const roster = useLive(rosterEntries, [])
const selectedId = ref(0)
const recruitId = ref(0)

const actor = computed(
  () => members.value.find((member) => member.id === selectedId.value) ?? members.value[0],
)

const recruits = computed(() =>
  roster.value
    .filter((entry) => !entry.inParty)
    .map((entry) => ({ value: entry.id, label: entry.name })),
)

const chosenRecruit = computed({
  get: () => {
    const isListed = recruits.value.some((option) => option.value === recruitId.value)
    return isListed ? recruitId.value : (recruits.value[0]?.value ?? 0)
  },
  set: (id) => {
    recruitId.value = id
  },
})

function apply(change: () => void) {
  change()
  refreshLive()
}

function remove(actorId: number) {
  if (!removeMember(actorId)) overlay.notify('The party needs one member', 'error')
  refreshLive()
}
</script>

<template>
  <UiSection title="Party">
    <UiRow label="God mode for everyone" hint="No HP loss, no knockout, skills cost nothing.">
      <UiToggle
        :model-value="cheats.godParty"
        label="God mode for everyone"
        @update:model-value="setPartyGodMode"
      />
      <UiButton @click="apply(recoverParty)">Recover all</UiButton>
    </UiRow>
    <UiRow v-if="recruits.length > 0" label="Add member">
      <UiSelect v-model="chosenRecruit" label="Add member" :options="recruits" />
      <UiButton @click="apply(() => addMember(chosenRecruit))">Add</UiButton>
    </UiRow>
    <UiButtonRow>
      <UiButton
        v-for="member in members"
        :key="member.id"
        :active="member.id === actor?.id"
        @click="selectedId = member.id"
      >
        {{ member.name }}
      </UiButton>
    </UiButtonRow>
    <p v-if="members.length === 0" class="py-2 text-dim">No party yet. Start or load a game.</p>
  </UiSection>

  <UiSection v-if="actor" :title="actor.name">
    <UiRow label="God mode">
      <UiToggle
        :model-value="cheats.godActorIds.includes(actor.id)"
        :label="`God mode for ${actor.name}`"
        @update:model-value="(enabled) => actor && setGodMode(actor.id, enabled)"
      />
      <UiButton @click="apply(() => actor && recoverActor(actor.id))">Recover</UiButton>
      <UiButton @click="remove(actor.id)">Remove</UiButton>
    </UiRow>
    <UiRow label="Level">
      <UiNumberField
        label="Level"
        :model-value="actor.level"
        :min="1"
        :max="actor.maxLevel"
        @update:model-value="(value) => apply(() => actor && setLevel(actor.id, value))"
      />
      <UiButton @click="apply(() => actor && maxLevel(actor.id))">Max</UiButton>
    </UiRow>
    <div class="grid grid-cols-2 gap-x-4">
      <UiRow label="EXP">
        <UiNumberField
          label="EXP"
          :model-value="actor.exp"
          @update:model-value="(value) => apply(() => actor && setExp(actor.id, value))"
        />
      </UiRow>
      <UiRow label="HP">
        <UiNumberField
          label="HP"
          :model-value="actor.hp"
          :max="actor.maxHp"
          @update:model-value="(value) => apply(() => actor && setHp(actor.id, value))"
        />
      </UiRow>
      <UiRow label="MP">
        <UiNumberField
          label="MP"
          :model-value="actor.mp"
          :max="actor.maxMp"
          @update:model-value="(value) => apply(() => actor && setMp(actor.id, value))"
        />
      </UiRow>
      <UiRow label="TP">
        <UiNumberField
          label="TP"
          :model-value="actor.tp"
          :max="actor.maxTp"
          @update:model-value="(value) => apply(() => actor && setTp(actor.id, value))"
        />
      </UiRow>
      <UiRow v-for="(label, paramId) in PARAM_LABELS" :key="label" :label="label">
        <UiNumberField
          :label="label"
          :model-value="actor.params[paramId] ?? 0"
          :max="MAX_PARAM_INPUT"
          @update:model-value="(value) => apply(() => actor && setParam(actor.id, paramId, value))"
        />
      </UiRow>
    </div>
    <UiButtonRow>
      <UiButton variant="primary" @click="apply(() => actor && maxParams(actor.id))">
        Max all stats
      </UiButton>
    </UiButtonRow>
  </UiSection>
</template>
