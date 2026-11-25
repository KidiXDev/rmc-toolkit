<script setup lang="ts">
import { onMounted, onScopeDispose, ref, watch } from 'vue'

import { parseVariable } from '@/cheats/gameData'
import { SPEED_RANGE } from '@/cheats/speed'
import {
  LIVE_VARIABLE_LENGTH,
  type LiveAction,
  type LiveDetail,
  type LiveGameState,
  type LiveMapCamera,
  type LiveQuery,
  type LiveReply,
  type LiveView,
} from '@/engine/liveProtocol'
import UiButton from '@/ui/UiButton.vue'
import UiCommitField from '@/ui/UiCommitField.vue'
import UiConfirmButton from '@/ui/UiConfirmButton.vue'
import UiNumberField from '@/ui/UiNumberField.vue'
import UiRow from '@/ui/UiRow.vue'
import UiSection from '@/ui/UiSection.vue'
import UiToggle from '@/ui/UiToggle.vue'

import { liveGame } from '../api'
import LiveBattle from './LiveBattle.vue'
import LiveCatalog from './LiveCatalog.vue'
import LiveMap from './LiveMap.vue'

const { id } = defineProps<{ id: string }>()

const POLL_MS = 400
const MAP_POLL_MS = 120
const SECTIONS = [
  { id: 'player', label: 'Player', view: 'player' },
  { id: 'map', label: 'Map', view: 'map' },
  { id: 'inventory', label: 'Inventory', view: 'items' },
  { id: 'battle', label: 'Battle', view: 'battle' },
  { id: 'data', label: 'Game Data', view: 'switches' },
] as const
const INVENTORY = [
  { view: 'items', label: 'Items' },
  { view: 'weapons', label: 'Weapons' },
  { view: 'armors', label: 'Armor' },
] as const
const DATA = [
  { view: 'switches', label: 'Switches' },
  { view: 'variables', label: 'Variables' },
] as const
const TOGGLES = [
  { kind: 'noClip', label: 'No-clip' },
  { kind: 'noEncounters', label: 'No random encounters' },
  { kind: 'godParty', label: 'Party god mode' },
] as const
const SPEEDS = [
  { kind: 'gameSpeed', label: 'Field speed' },
  { kind: 'battleSpeed', label: 'Battle speed' },
] as const

const state = ref<LiveGameState | null>(null)
const detail = ref<LiveDetail>()
const section = ref<(typeof SECTIONS)[number]['id']>('player')
const query = ref<LiveQuery>({ view: 'player', search: '', page: 0 })
const status = ref('Connecting to the game…')
const actionError = ref('')
const busy = ref(false)
let disposed = false
let polling = false
let revision = 0
let timer: number | undefined

function show(reply: LiveReply | null) {
  state.value = reply?.status === 'live' ? reply.state : null
  detail.value = reply?.status === 'live' ? reply.detail : undefined
  if (reply?.status === 'waiting') status.value = 'Start or load a game to enable live controls.'
  else if (reply?.status === 'error') status.value = reply.message
  else status.value = reply ? 'Connected' : 'Waiting for a connection to the game…'
}

async function poll() {
  if (disposed || polling) return
  if (!busy.value) {
    polling = true
    const startedAt = revision
    const reply = await liveGame(id, query.value).catch(() => null)
    polling = false
    if (!disposed && startedAt === revision) show(reply)
  }
  if (!disposed) {
    const delay = query.value.view === 'map' && state.value ? MAP_POLL_MS : POLL_MS
    timer = window.setTimeout(() => void poll(), delay)
  }
}

async function send(action: LiveAction) {
  if (!state.value || busy.value) return
  const { session } = state.value
  busy.value = true
  actionError.value = ''
  revision += 1
  const startedAt = revision
  try {
    const reply = await liveGame(id, query.value, session, action)
    if (disposed) return
    if (reply?.status === 'live') {
      if (startedAt === revision) show(reply)
    } else
      actionError.value =
        reply?.status === 'error' ? reply.message : 'The game did not confirm the change.'
  } catch (error) {
    if (!disposed) actionError.value = String(error)
  } finally {
    if (!disposed) busy.value = false
  }
}

function changeView(view: LiveView) {
  if (view !== query.value.view) query.value = { view, search: '', page: 0 }
}

function changeSearch(search: string) {
  query.value = { ...query.value, search, page: 0 }
}

function changePage(page: number) {
  query.value = { ...query.value, page }
}

function changeCamera(camera: LiveMapCamera | null) {
  query.value = { ...query.value, camera }
}

function selectSection(next: (typeof SECTIONS)[number]) {
  if (section.value === next.id) return
  section.value = next.id
  actionError.value = ''
  changeView(next.view)
}

watch(
  query,
  (next, previous) => {
    if (
      next.view === previous.view &&
      next.search === previous.search &&
      next.page === previous.page
    )
      return
    revision += 1
    window.clearTimeout(timer)
    void poll()
  },
  { flush: 'sync' },
)

function changeSpeed(event: Event, kind: 'gameSpeed' | 'battleSpeed') {
  if (!(event.target instanceof HTMLInputElement) || !state.value) return
  const input = event.target
  const speed = input.valueAsNumber
  if (Number.isFinite(speed)) {
    void send({ kind, value: Math.min(SPEED_RANGE.max, Math.max(SPEED_RANGE.min, speed)) })
  }
  input.value = String(state.value[kind])
}

onMounted(() => void poll())
onScopeDispose(() => {
  disposed = true
  window.clearTimeout(timer)
})
</script>

<template>
  <div class="grid gap-2">
    <div class="flex flex-wrap items-center justify-between border-b-hairline pb-2 gap-2">
      <div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="Live controls">
        <UiButton
          v-for="item in SECTIONS"
          :key="item.id"
          :active="section === item.id"
          :aria-pressed="section === item.id"
          @click="selectSection(item)"
        >
          {{ item.label }}
        </UiButton>
      </div>
      <p class="text-dim" role="status">{{ status }}</p>
    </div>
    <p v-if="actionError" class="text-danger" role="alert">{{ actionError }}</p>
    <fieldset v-if="state" :disabled="busy" class="grid min-w-0">
      <UiSection v-if="section === 'player'" title="Player and party">
        <UiRow label="Map">
          <span class="max-w-64 break-words">{{ state.map }}</span>
          <span v-if="state.inBattle" class="font-bold">In battle</span>
        </UiRow>
        <UiRow label="Gold">
          <UiNumberField
            label="Gold"
            :model-value="state.gold"
            :max="state.maxGold"
            @update:model-value="send({ kind: 'gold', value: $event })"
          />
          <UiButton @click="send({ kind: 'gold', value: state.maxGold })">Max</UiButton>
        </UiRow>
        <UiRow v-for="{ kind, label } in SPEEDS" :key="kind" :label="label">
          <input
            type="number"
            class="w-24 rounded-control border-outline border-ink bg-paper px-2 py-0.5 text-right font-mono text-[12px] focus:border-accent"
            :aria-label="label"
            :min="SPEED_RANGE.min"
            :max="SPEED_RANGE.max"
            step="0.1"
            :value="state[kind]"
            @change="changeSpeed($event, kind)"
            @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
          />
          <span>×</span>
        </UiRow>
        <UiRow v-for="{ kind, label } in TOGGLES" :key="kind" :label="label">
          <UiToggle
            :label="label"
            :model-value="state[kind]"
            @update:model-value="send({ kind, value: $event })"
          />
        </UiRow>
        <UiRow v-if="state.party.length" label="Party">
          <UiButton @click="send({ kind: 'recoverParty' })">Recover party</UiButton>
        </UiRow>
        <table
          v-if="state.party.length"
          class="my-2 w-full text-left text-[12px]"
          aria-label="Party"
        >
          <thead class="border-b-hairline">
            <tr>
              <th scope="col" class="py-1">Actor</th>
              <th scope="col">Level</th>
              <th scope="col">HP</th>
              <th scope="col">MP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="actor in state.party" :key="actor.id" class="border-b-hairline">
              <th scope="row" class="py-1 font-normal">{{ actor.name }}</th>
              <td>{{ actor.level }}</td>
              <td class="whitespace-nowrap py-1">
                <UiNumberField
                  :label="`${actor.name} HP`"
                  :model-value="actor.hp"
                  :max="actor.maxHp"
                  @update:model-value="send({ kind: 'hp', actorId: actor.id, value: $event })"
                />
                <span class="px-1">/ {{ actor.maxHp }}</span>
              </td>
              <td class="whitespace-nowrap py-1">
                <UiNumberField
                  :label="`${actor.name} MP`"
                  :model-value="actor.mp"
                  :max="actor.maxMp"
                  @update:model-value="send({ kind: 'mp', actorId: actor.id, value: $event })"
                />
                <span class="px-1">/ {{ actor.maxMp }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </UiSection>

      <LiveMap
        v-else-if="section === 'map' && detail?.kind === 'map'"
        :map="state.map"
        :detail="detail"
        :search="query.search"
        @action="send"
        @camera="changeCamera"
        @search="changeSearch"
        @page="changePage"
      />

      <LiveBattle
        v-else-if="section === 'battle' && detail?.kind === 'battle'"
        :detail="detail"
        @action="send"
      />

      <UiSection v-else-if="section === 'inventory'" title="Inventory">
        <div class="flex flex-wrap items-center pb-2 gap-2">
          <UiButton
            v-for="item in INVENTORY"
            :key="item.view"
            :active="query.view === item.view"
            :aria-pressed="query.view === item.view"
            @click="changeView(item.view)"
          >
            {{ item.label }}
          </UiButton>
        </div>
        <LiveCatalog
          v-if="detail?.kind === 'inventory' && detail.group === query.view"
          :key="detail.group"
          :catalog="detail.catalog"
          :search="query.search"
          label="Search inventory by name or number"
          @search="changeSearch"
          @page="changePage"
        >
          <template #actions>
            <UiConfirmButton @confirm="send({ kind: 'maxInventory', group: detail.group })">
              Max category
            </UiConfirmButton>
          </template>
          <template #default="{ row }">
            <div class="flex items-center gap-2" :title="row.description">
              <UiNumberField
                :label="`${row.name} quantity`"
                :model-value="row.quantity"
                :max="row.max"
                @update:model-value="
                  send({ kind: 'quantity', group: detail.group, id: row.id, value: $event })
                "
              />
              <UiButton
                @click="send({ kind: 'quantity', group: detail.group, id: row.id, value: row.max })"
              >
                Max
              </UiButton>
            </div>
          </template>
        </LiveCatalog>
        <p v-else class="py-2 text-dim">Loading inventory…</p>
      </UiSection>

      <UiSection v-else-if="section === 'data'" title="Switches and variables">
        <div class="flex flex-wrap items-center pb-2 gap-2">
          <UiButton
            v-for="item in DATA"
            :key="item.view"
            :active="query.view === item.view"
            :aria-pressed="query.view === item.view"
            @click="changeView(item.view)"
          >
            {{ item.label }}
          </UiButton>
        </div>
        <LiveCatalog
          v-if="query.view === 'switches' && detail?.kind === 'switches'"
          :catalog="detail.catalog"
          :search="query.search"
          label="Search switches by name or number"
          @search="changeSearch"
          @page="changePage"
        >
          <template #default="{ row }">
            <UiToggle
              :label="row.name || `Switch ${row.id}`"
              :model-value="row.value"
              @update:model-value="send({ kind: 'switch', id: row.id, value: $event })"
            />
          </template>
        </LiveCatalog>
        <LiveCatalog
          v-else-if="query.view === 'variables' && detail?.kind === 'variables'"
          :catalog="detail.catalog"
          :search="query.search"
          label="Search variables by name or number"
          @search="changeSearch"
          @page="changePage"
        >
          <template #default="{ row }">
            <span v-if="row.value === null" class="text-dim">Read-only</span>
            <UiCommitField
              v-else
              :label="row.name || `Variable ${row.id}`"
              :value="String(row.value)"
              :maxlength="LIVE_VARIABLE_LENGTH"
              @commit="send({ kind: 'variable', id: row.id, value: parseVariable($event) })"
            />
          </template>
        </LiveCatalog>
        <p v-else class="py-2 text-dim">Loading game data…</p>
      </UiSection>
      <p v-else class="py-2 text-dim">Loading {{ section }}…</p>
    </fieldset>
  </div>
</template>
