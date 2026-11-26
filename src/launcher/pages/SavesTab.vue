<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

import UiButton from '@/ui/UiButton.vue'
import UiConfirmButton from '@/ui/UiConfirmButton.vue'
import UiSection from '@/ui/UiSection.vue'

import {
  createBackup,
  deleteBackup,
  listBackups,
  restoreBackup,
  type Backup,
  type GameInfo,
} from '../api'
import { backupLabel, countLabel, formatBytes, formatDate } from '../format'
import { useLibrary } from '../library'

const { game } = defineProps<{ game: GameInfo }>()

const library = useLibrary()
const backups = ref<Backup[]>([])
const isBusy = ref(false)

async function load() {
  backups.value = await listBackups(game.id)
}

async function run(action: () => Promise<unknown>, done: string) {
  if (isBusy.value) return
  isBusy.value = true
  const succeeded = await library.attempt(async () => {
    await action()
    await load()
  })
  isBusy.value = false
  if (succeeded) library.notify(done)
}

onMounted(() => library.attempt(load))
watch([() => game.session !== null, () => library.backupRevision], () => library.attempt(load))
</script>

<template>
  <UiSection title="Save backups">
    <div class="grid grid-flow-col justify-start py-2 gap-2">
      <UiButton
        variant="primary"
        :disabled="isBusy"
        @click="run(() => createBackup(game.id), 'Saves backed up')"
      >
        Back up saves
      </UiButton>
      <UiButton @click="library.openFolder(game, 'saves')">Open saves</UiButton>
      <UiButton @click="library.openFolder(game, 'backups')">Open backups</UiButton>
    </div>
    <p v-if="backups.length === 0" class="text-dim">
      No backups yet. The launcher also makes one before you play, if you keep that on in Settings.
    </p>
    <TransitionGroup tag="div" name="rows">
      <div
        v-for="backup in backups"
        :key="backup.id"
        class="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center border-b-hairline py-1.5 gap-2"
      >
        <div>
          <p class="font-bold">{{ formatDate(backup.createdAt) }}</p>
          <p class="text-[12px] text-dim">
            {{ backupLabel(backup.kind) }}, {{ countLabel(backup.files, 'file') }},
            {{ formatBytes(backup.bytes) }}
          </p>
        </div>
        <UiConfirmButton
          :disabled="isBusy || game.session !== null"
          @confirm="run(() => restoreBackup(game.id, backup.id), 'Saves restored')"
        >
          Restore
        </UiConfirmButton>
        <UiConfirmButton
          :disabled="isBusy"
          @confirm="run(() => deleteBackup(game.id, backup.id), 'Backup deleted')"
        >
          Delete
        </UiConfirmButton>
      </div>
    </TransitionGroup>
    <p v-if="backups.length > 0" class="pt-2 text-[12px] text-dim">
      Restoring first backs up your current saves, so you can go back.
    </p>
  </UiSection>
</template>
