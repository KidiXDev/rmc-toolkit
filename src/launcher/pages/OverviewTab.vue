<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import UiButton from '@/ui/UiButton.vue'
import UiRow from '@/ui/UiRow.vue'

import { summarize } from '../activityStats'
import { listBackups, type Backup, type GameInfo } from '../api'
import DayChart from '../components/DayChart.vue'
import LiveTimer from '../components/LiveTimer.vue'
import PlayStatusBadge from '../components/PlayStatusBadge.vue'
import SessionList from '../components/SessionList.vue'
import StatusBadge from '../components/StatusBadge.vue'
import {
  backupLabel,
  cheatLabel,
  countLabel,
  engineLabel,
  formatBytes,
  formatDate,
  formatDuration,
  formatPlaytime,
} from '../format'
import { isLiveReady } from '../gamePage'
import { useLibrary } from '../library'
import type { GameTabId } from '../navigation'

const { game } = defineProps<{ game: GameInfo }>()
const emit = defineEmits<{ openTab: [tab: GameTabId] }>()

const RECENT_SESSIONS = 3
const WEEK_DAYS = 7
const QUICK_KEYS = [
  { keys: 'Ctrl+C', action: 'Cheat window' },
  { keys: 'Ctrl+S', action: 'Quick save' },
  { keys: 'Ctrl+L', action: 'Quick load' },
  { keys: 'Ctrl+N', action: 'No-clip' },
] as const

const library = useLibrary()
const backups = ref<Backup[]>([])
const backupsLoaded = ref(false)
const notesDraft = ref(game.notes)
const isSavingNotes = ref(false)
let disposed = false
let loadToken = 0

const sessions = computed(() => library.sessions.filter((session) => session.game === game.id))
const weekSummary = computed(() => summarize(sessions.value, WEEK_DAYS, library.fetchedAt))
const longestSessionMs = computed(() =>
  Math.max(0, ...sessions.value.map((session) => session.playedMs)),
)
const latestBackup = computed(() => backups.value[0] ?? null)
const isBusy = computed(() => library.busyIds.has(game.id))
const hasUnsavedNotes = computed(() => notesDraft.value !== game.notes)
const hasCheatsInstalled = computed(() => game.status === 'current' || game.status === 'outdated')

watch(
  () => game.notes,
  (next) => {
    notesDraft.value = next
  },
)

async function saveNotes() {
  if (!hasUnsavedNotes.value || isSavingNotes.value) return
  isSavingNotes.value = true
  await library.setNotes(game, notesDraft.value)
  if (!disposed) isSavingNotes.value = false
}

async function loadBackups() {
  const token = ++loadToken
  try {
    const list = await listBackups(game.id)
    if (disposed || token !== loadToken) return
    backups.value = list
    backupsLoaded.value = true
  } catch {
    if (disposed || token !== loadToken) return
    backups.value = []
    backupsLoaded.value = true
  }
}

onMounted(() => void loadBackups())
onBeforeUnmount(() => {
  disposed = true
})

watch(
  [() => game.id, () => game.session !== null, () => library.backupRevision],
  () => void loadBackups(),
)
</script>

<template>
  <div class="grid gap-4">
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-control border-hairline bg-panel px-3.5 py-2.5">
        <p class="text-xs text-dim">Total playtime</p>
        <p class="mt-0.5 font-display text-xl font-extrabold italic leading-tight">
          <span
            v-if="game.session !== null"
            class="grid grid-flow-col items-center justify-start gap-2"
          >
            <span class="playing-dot !h-2.5 !w-2.5" aria-hidden="true" />
            <LiveTimer :game="game" />
          </span>
          <template v-else>{{ formatPlaytime(game.playMs) }}</template>
        </p>
        <p class="mt-0.5 text-xs text-dim">
          7 days: {{ weekSummary.playedMs > 0 ? formatDuration(weekSummary.playedMs) : '0 min' }}
        </p>
      </div>

      <div class="rounded-control border-hairline bg-panel px-3.5 py-2.5">
        <p class="text-xs text-dim">Last played</p>
        <p class="mt-0.5 truncate font-display text-lg font-extrabold italic leading-tight">
          {{
            game.session !== null
              ? 'Playing now'
              : game.lastPlayed === null
                ? 'Never'
                : formatDate(game.lastPlayed)
          }}
        </p>
        <p class="mt-0.5 truncate text-xs text-dim">Added {{ formatDate(game.addedAt) }}</p>
      </div>

      <button
        type="button"
        class="smooth rounded-control border-hairline bg-panel px-3.5 py-2.5 text-left hover:border-ink hover:bg-paper"
        @click="emit('openTab', 'activity')"
      >
        <span class="block text-xs text-dim">Sessions</span>
        <span class="mt-0.5 block font-display text-xl font-extrabold italic leading-tight">
          {{ sessions.length }}
        </span>
        <span class="mt-0.5 block truncate text-xs text-dim">
          Longest: {{ formatDuration(longestSessionMs) }}
        </span>
      </button>

      <button
        type="button"
        class="smooth rounded-control border-hairline bg-panel px-3.5 py-2.5 text-left hover:border-ink hover:bg-paper"
        @click="emit('openTab', 'saves')"
      >
        <span class="block text-xs text-dim">Save backups</span>
        <span class="mt-0.5 block font-display text-xl font-extrabold italic leading-tight">
          {{ backupsLoaded ? backups.length : '—' }}
        </span>
        <span class="mt-0.5 block truncate text-xs text-dim">
          {{ latestBackup ? formatBytes(latestBackup.bytes) : 'No backups yet' }}
        </span>
      </button>
    </div>

    <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div class="grid gap-4">
        <section class="rounded-control border-hairline bg-panel p-4">
          <div class="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <h2 class="font-display text-base font-extrabold italic">Notes</h2>
            <div class="grid grid-flow-col items-center gap-2">
              <span class="text-xs text-dim">
                {{
                  isSavingNotes
                    ? 'Saving…'
                    : hasUnsavedNotes
                      ? 'Unsaved changes'
                      : game.notes
                        ? 'Saved'
                        : 'Auto-saves on blur'
                }}
              </span>
              <UiButton
                v-if="hasUnsavedNotes"
                variant="primary"
                :disabled="isSavingNotes"
                @click="saveNotes"
              >
                Save
              </UiButton>
            </div>
          </div>
          <textarea
            v-model="notesDraft"
            rows="4"
            class="smooth block w-full select-text resize-y rounded-control border-outline border-ink bg-paper px-2.5 py-2 text-sm text-ink hover:bg-panel focus:border-accent focus:bg-paper"
            aria-label="Notes"
            placeholder="Write reminders, walkthrough hints, or route notes for this game"
            @blur="saveNotes"
            @keydown.ctrl.enter.prevent="saveNotes"
          />
        </section>

        <section class="rounded-control border-hairline bg-panel p-4">
          <div class="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <div>
              <h2 class="font-display text-base font-extrabold italic">Recent activity</h2>
              <p class="text-xs text-dim">
                Last 7 days · {{ countLabel(weekSummary.sessions, 'session') }}
              </p>
            </div>
            <UiButton @click="emit('openTab', 'activity')">All activity</UiButton>
          </div>
          <DayChart class="mb-3" :sessions="sessions" :days="WEEK_DAYS" />
          <div class="border-t-hairline pt-2">
            <SessionList :sessions="sessions" :limit="RECENT_SESSIONS" />
          </div>
        </section>
      </div>

      <div class="grid gap-4">
        <section class="rounded-control border-hairline bg-panel p-4">
          <div class="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <h2 class="font-display text-base font-extrabold italic">Cheats</h2>
            <StatusBadge :status="game.status" />
          </div>
          <p class="text-sm">{{ cheatLabel(game) }}.</p>
          <p v-if="!game.isSupported" class="mt-1 text-sm text-danger">
            RPG Maker {{ game.engine }} {{ game.makerVersion }} is older than 1.6; the cheat window
            may not open.
          </p>
          <div v-if="hasCheatsInstalled" class="mt-3 grid grid-cols-2 gap-1.5">
            <div
              v-for="item in QUICK_KEYS"
              :key="item.keys"
              class="grid grid-cols-[auto_minmax(0,1fr)] items-center rounded-control border-hairline bg-paper px-2 py-1 text-xs gap-1.5"
            >
              <kbd class="font-mono font-bold">{{ item.keys }}</kbd>
              <span class="truncate text-dim">{{ item.action }}</span>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <UiButton v-if="isLiveReady(game)" variant="primary" @click="emit('openTab', 'live')">
              Open live controls
            </UiButton>
            <UiButton
              v-else-if="game.status !== 'current'"
              variant="primary"
              :disabled="game.session !== null || isBusy"
              @click="library.install(game)"
            >
              {{ game.status === 'outdated' ? 'Update cheats' : 'Install cheats' }}
            </UiButton>
            <UiButton @click="emit('openTab', 'cheats')">Manage cheats</UiButton>
          </div>
        </section>

        <section class="rounded-control border-hairline bg-panel p-4">
          <div class="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <h2 class="font-display text-base font-extrabold italic">Saves</h2>
            <UiButton @click="emit('openTab', 'saves')">All backups</UiButton>
          </div>
          <div v-if="latestBackup" class="rounded-control border-hairline bg-paper px-3 py-2">
            <p class="text-sm font-bold">{{ formatDate(latestBackup.createdAt) }}</p>
            <p class="text-xs text-dim">
              {{ backupLabel(latestBackup.kind) }} · {{ countLabel(latestBackup.files, 'file') }} ·
              {{ formatBytes(latestBackup.bytes) }}
            </p>
          </div>
          <p v-else class="text-sm text-dim">
            {{ backupsLoaded ? 'No backups yet.' : 'Loading backups…' }}
          </p>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <UiButton :disabled="isBusy" @click="library.backupSaves(game)">Back up saves</UiButton>
            <UiButton @click="library.openFolder(game, 'saves')">Open saves</UiButton>
          </div>
        </section>

        <section class="rounded-control border-hairline bg-panel p-4">
          <div class="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <h2 class="font-display text-base font-extrabold italic">Game info</h2>
            <UiButton @click="emit('openTab', 'details')">Edit details</UiButton>
          </div>
          <UiRow label="Engine">{{ engineLabel(game) }}</UiRow>
          <UiRow label="Status">
            <PlayStatusBadge v-if="game.playStatus !== 'unsorted'" :status="game.playStatus" />
            <span v-else class="text-sm text-dim">No status</span>
          </UiRow>
          <UiRow label="Program">
            <span
              class="max-w-[180px] truncate font-mono text-xs"
              :class="game.executable === null ? 'text-danger' : 'text-dim'"
              :title="game.executable ?? undefined"
            >
              {{ game.executable ?? 'Not found' }}
            </span>
            <UiButton v-if="game.executable === null" @click="library.chooseExecutable(game)">
              Choose
            </UiButton>
          </UiRow>
          <UiRow label="Folder">
            <span class="max-w-[160px] truncate font-mono text-xs text-dim" :title="game.path">
              {{ game.path }}
            </span>
            <UiButton @click="library.openFolder(game, 'game')">Open</UiButton>
          </UiRow>
        </section>
      </div>
    </div>
  </div>
</template>
