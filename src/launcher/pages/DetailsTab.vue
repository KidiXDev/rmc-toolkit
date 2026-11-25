<script setup lang="ts">
import UiButton from '@/ui/UiButton.vue'
import UiCommitField from '@/ui/UiCommitField.vue'
import UiConfirmButton from '@/ui/UiConfirmButton.vue'
import UiRow from '@/ui/UiRow.vue'
import UiSection from '@/ui/UiSection.vue'

import type { GameInfo } from '../api'
import { engineLabel, formatDate } from '../format'
import { useLibrary } from '../library'

defineProps<{ game: GameInfo }>()

const library = useLibrary()
</script>

<template>
  <UiSection title="In your library">
    <UiRow label="Title" hint="Leave empty to use the game's own title.">
      <UiCommitField
        class="!w-64 !text-left"
        label="Title"
        :value="game.title"
        @commit="(title) => library.rename(game, title)"
      />
    </UiRow>
    <UiRow label="Cover">
      <UiButton @click="library.chooseCover(game)">Choose image</UiButton>
      <UiButton @click="library.resetCover(game)">Use game art</UiButton>
    </UiRow>
    <UiRow label="Added">{{ formatDate(game.addedAt) }}</UiRow>
  </UiSection>

  <UiSection title="Files">
    <UiRow label="Engine">{{ engineLabel(game) }}</UiRow>
    <UiRow label="Folder">
      <span class="max-w-[400px] truncate font-mono text-[12px] text-dim" :title="game.path">
        {{ game.path }}
      </span>
      <UiButton @click="library.openFolder(game, 'game')">Open</UiButton>
    </UiRow>
    <UiRow label="Program">
      <span
        class="max-w-[400px] truncate font-mono text-[12px] text-dim"
        :title="game.executable ?? undefined"
      >
        {{ game.executable ?? 'Not found' }}
      </span>
      <UiButton @click="library.chooseExecutable(game)">Choose</UiButton>
    </UiRow>
    <UiRow label="Remove from library" hint="The game and your saves stay on disk.">
      <UiConfirmButton :disabled="game.isRunning" @confirm="library.remove(game)">
        Remove
      </UiConfirmButton>
    </UiRow>
  </UiSection>
</template>
