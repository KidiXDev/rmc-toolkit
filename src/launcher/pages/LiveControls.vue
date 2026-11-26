<script setup lang="ts">
import { nextTick, onMounted, onScopeDispose, ref, useTemplateRef, watch } from 'vue'

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
import { vFx } from '@/themes/activeEffects'
import UiButton from '@/ui/UiButton.vue'
import UiCommitField from '@/ui/UiCommitField.vue'
import UiConfirmButton from '@/ui/UiConfirmButton.vue'
import UiNumberField from '@/ui/UiNumberField.vue'
import UiRow from '@/ui/UiRow.vue'
import UiSection from '@/ui/UiSection.vue'
import UiToggle from '@/ui/UiToggle.vue'

import { liveGame } from '../api'
import { countLabel } from '../format'
import LiveBattle from './LiveBattle.vue'
import LiveCatalog from './LiveCatalog.vue'
import LiveMap from './LiveMap.vue'

const { id } = defineProps<{ id: string }>()

const POLL_MS = 400
const MAP_POLL_MS = 120
const SPEED_PRESETS = [1, 2, 4] as const
const STEP_BY_KEY: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 }
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

const tabList = useTemplateRef('tabList')
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

async function moveSection(event: KeyboardEvent) {
  const step = STEP_BY_KEY[event.key]
  if (!step) return
  event.preventDefault()

  const index = SECTIONS.findIndex((item) => item.id === section.value)
  const next = SECTIONS[(index + step + SECTIONS.length) % SECTIONS.length]
  if (!next) return

  selectSection(next)
  await nextTick()
  tabList.value?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus()
}

function openBattleSection() {
  selectSection(SECTIONS[3])
}

function meterPercent(current: number, max: number): string {
  if (max <= 0) return '0%'
  return `${Math.min(100, Math.max(0, Math.round((current / max) * 100)))}%`
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
  <div
    class="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-window border-outline border-ink bg-paper shadow-control"
  >
    <header
      class="flex flex-wrap items-center justify-between border-b-outline border-ink bg-panel px-3.5 py-2 gap-2"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="inline-block rounded-full border-hairline border-ink bg-paper px-2.5 py-0.5 text-xs font-bold"
          role="status"
        >
          <span class="grid grid-flow-col items-center gap-1.5">
            <span
              class="h-2 w-2 rounded-full"
              :class="state ? 'playing-dot !h-2 !w-2' : 'bg-dim'"
              aria-hidden="true"
            />
            <span>{{ status }}</span>
          </span>
        </span>
        <Transition name="badge">
          <button
            v-if="state?.inBattle"
            v-fx:action
            type="button"
            class="smooth rounded-full border-outline border-ink bg-accent px-2.5 py-0.5 text-xs font-bold text-onfill hover:bg-accent-hover"
            @click="openBattleSection"
          >
            In battle
          </button>
        </Transition>
      </div>

      <div v-if="state" class="flex flex-wrap items-center text-xs gap-2">
        <span class="rounded-control border-hairline bg-paper px-2 py-0.5">
          <span class="text-dim">Map:</span>
          <strong class="pl-1">{{ state.map }}</strong>
        </span>
        <span class="rounded-control border-hairline bg-paper px-2 py-0.5 font-mono">
          <strong>{{ state.gold.toLocaleString() }}</strong> G
        </span>
        <span class="rounded-control border-hairline bg-paper px-2 py-0.5 text-dim">
          {{ countLabel(state.party.length, 'actor') }}
        </span>
      </div>
    </header>

    <div class="grid min-h-0 grid-cols-[152px_minmax(0,1fr)]">
      <div
        ref="tabList"
        v-fx:tabs
        role="tablist"
        aria-orientation="vertical"
        aria-label="Live controls"
        class="relative overflow-y-auto border-r-outline border-ink bg-panel py-2"
        @keydown="moveSection"
      >
        <button
          v-for="item in SECTIONS"
          :key="item.id"
          type="button"
          role="tab"
          class="smooth relative block w-full px-3 py-2 text-left font-display text-sm italic"
          :class="
            section === item.id
              ? 'bg-soft font-extrabold text-ink'
              : 'font-bold text-dim hover:bg-paper hover:text-ink'
          "
          :aria-selected="section === item.id"
          :tabindex="section === item.id ? 0 : -1"
          @click="selectSection(item)"
        >
          <span class="grid grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-2">
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              class="h-3.5 w-3.5 fill-none stroke-current"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                v-if="item.id === 'player'"
                d="M8 7.5a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6ZM3 13.8c.7-2.4 2.6-3.6 5-3.6s4.3 1.2 5 3.6"
              />
              <path
                v-else-if="item.id === 'map'"
                d="M1.8 3.6 5.8 2l4.4 1.6L14.2 2v10.4L10.2 14l-4.4-1.6-4 1.6Z"
              />
              <path
                v-else-if="item.id === 'inventory'"
                d="M3 5.5h10l-.8 8.2H3.8L3 5.5Zm2.5 0V4a2.5 2.5 0 0 1 5 0v1.5"
              />
              <path
                v-else-if="item.id === 'battle'"
                d="m3 13 4.5-4.5M13 3l-5.5 5.5M9.5 3H13v3.5M4.5 9.5 6.5 11.5"
              />
              <path v-else d="M3 4.5h10M3 8h10M3 11.5h10M6 3.5v2M10 7v2M7 10.5v2" />
            </svg>
            <span class="truncate">{{ item.label }}</span>
            <span
              v-if="item.id === 'battle' && state?.inBattle"
              class="playing-dot !h-2 !w-2"
              aria-hidden="true"
            />
          </span>
        </button>
      </div>

      <div class="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-3.5 gap-2">
        <p
          v-if="actionError"
          class="panel-in rounded-control border-hairline border-danger bg-panel px-3 py-1.5 text-sm text-danger"
          role="alert"
        >
          {{ actionError }}
        </p>

        <div v-if="!state" class="grid place-items-center text-center text-dim">
          <p class="max-w-[360px] text-sm">{{ status }}</p>
        </div>

        <fieldset
          v-else
          :key="section"
          :disabled="busy"
          class="panel-in min-h-0 min-w-0 overflow-hidden"
        >
          <div
            v-if="section === 'player'"
            class="grid h-full min-h-0 gap-3.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
          >
            <div
              class="grid min-h-0 content-start overflow-y-auto rounded-control border-hairline bg-panel p-3.5 gap-3"
            >
              <UiSection title="Gold and speed">
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
                  <UiButton
                    v-for="preset in SPEED_PRESETS"
                    :key="preset"
                    :active="state[kind] === preset"
                    @click="send({ kind, value: preset })"
                  >
                    {{ preset }}×
                  </UiButton>
                  <input
                    v-fx:input
                    type="number"
                    class="w-16 rounded-control border-outline border-ink bg-paper px-1.5 py-0.5 text-right font-mono text-xs focus:border-accent"
                    :aria-label="label"
                    :min="SPEED_RANGE.min"
                    :max="SPEED_RANGE.max"
                    step="0.1"
                    :value="state[kind]"
                    @change="changeSpeed($event, kind)"
                    @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
                  />
                </UiRow>
              </UiSection>

              <UiSection title="Toggles">
                <UiRow v-for="{ kind, label } in TOGGLES" :key="kind" :label="label">
                  <UiToggle
                    :label="label"
                    :model-value="state[kind]"
                    @update:model-value="send({ kind, value: $event })"
                  />
                </UiRow>
              </UiSection>
            </div>

            <section
              class="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] rounded-control border-hairline bg-panel p-3.5"
            >
              <div class="mb-2.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <h2 class="font-display text-base font-extrabold italic">Party</h2>
                <UiButton
                  v-if="state.party.length"
                  variant="primary"
                  @click="send({ kind: 'recoverParty' })"
                >
                  Recover party
                </UiButton>
              </div>
              <p v-if="state.party.length === 0" class="text-sm text-dim">
                No party members active.
              </p>
              <div v-else class="grid content-start overflow-y-auto pr-1 gap-2" aria-label="Party">
                <div
                  v-for="actor in state.party"
                  :key="actor.id"
                  class="grid rounded-control border-hairline bg-paper p-2.5 gap-1.5"
                >
                  <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <span class="truncate font-bold">{{ actor.name }}</span>
                    <span class="rounded-full bg-panel px-2 py-0.5 font-mono text-xs text-dim">
                      Lv. {{ actor.level }}
                    </span>
                  </div>
                  <div class="grid grid-cols-[26px_minmax(0,1fr)_auto_auto] items-center gap-2">
                    <span class="text-xs font-bold text-dim">HP</span>
                    <span class="block h-2 overflow-hidden rounded-full bg-track">
                      <span
                        class="progress-fill block h-full bg-primary"
                        :style="{ width: meterPercent(actor.hp, actor.maxHp) }"
                      />
                    </span>
                    <UiNumberField
                      :label="`${actor.name} HP`"
                      :model-value="actor.hp"
                      :max="actor.maxHp"
                      @update:model-value="send({ kind: 'hp', actorId: actor.id, value: $event })"
                    />
                    <span class="w-16 font-mono text-xs text-dim">/ {{ actor.maxHp }}</span>
                  </div>
                  <div class="grid grid-cols-[26px_minmax(0,1fr)_auto_auto] items-center gap-2">
                    <span class="text-xs font-bold text-dim">MP</span>
                    <span class="block h-2 overflow-hidden rounded-full bg-track">
                      <span
                        class="progress-fill block h-full bg-accent"
                        :style="{ width: meterPercent(actor.mp, actor.maxMp) }"
                      />
                    </span>
                    <UiNumberField
                      :label="`${actor.name} MP`"
                      :model-value="actor.mp"
                      :max="actor.maxMp"
                      @update:model-value="send({ kind: 'mp', actorId: actor.id, value: $event })"
                    />
                    <span class="w-16 font-mono text-xs text-dim">/ {{ actor.maxMp }}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

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

          <div
            v-else-if="section === 'inventory'"
            class="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] rounded-control border-hairline bg-panel p-3.5 gap-2.5"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div
                class="inline-grid grid-flow-col rounded-control border-hairline bg-paper p-1 gap-1"
              >
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
              <UiConfirmButton
                v-if="detail?.kind === 'inventory' && detail.group === query.view"
                @confirm="send({ kind: 'maxInventory', group: detail.group })"
              >
                Max category
              </UiConfirmButton>
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
              <template #default="{ row }">
                <div class="grid grid-flow-col items-center gap-2" :title="row.description">
                  <UiNumberField
                    :label="`${row.name} quantity`"
                    :model-value="row.quantity"
                    :max="row.max"
                    @update:model-value="
                      send({ kind: 'quantity', group: detail.group, id: row.id, value: $event })
                    "
                  />
                  <UiButton
                    @click="
                      send({ kind: 'quantity', group: detail.group, id: row.id, value: row.max })
                    "
                  >
                    Max
                  </UiButton>
                </div>
              </template>
            </LiveCatalog>
            <p v-else class="py-2 text-dim">Loading inventory…</p>
          </div>

          <div
            v-else-if="section === 'data'"
            class="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] rounded-control border-hairline bg-panel p-3.5 gap-2.5"
          >
            <div
              class="inline-grid w-fit grid-flow-col rounded-control border-hairline bg-paper p-1 gap-1"
            >
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
              :key="'switches'"
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
              :key="'variables'"
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
          </div>
          <p v-else class="py-2 text-dim">Loading {{ section }}…</p>
        </fieldset>
      </div>
    </div>
  </div>
</template>
