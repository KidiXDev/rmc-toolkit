<script setup lang="ts" generic="T extends { id: number; name: string }">
import { LIVE_SEARCH_LENGTH, type LivePage } from '@/engine/liveProtocol'
import UiButton from '@/ui/UiButton.vue'
import UiTextField from '@/ui/UiTextField.vue'

defineProps<{ catalog: LivePage<T>; search: string; label: string }>()
const emit = defineEmits<{ search: [value: string]; page: [value: number] }>()
defineSlots<{ default(props: { row: T }): unknown; actions?(): unknown }>()
</script>

<template>
  <div class="mb-1.5 flex flex-wrap items-center gap-2">
    <UiTextField
      class="min-w-0 flex-1"
      :label="label"
      :placeholder="label"
      :maxlength="LIVE_SEARCH_LENGTH"
      :model-value="search"
      @update:model-value="emit('search', $event)"
    />
    <slot name="actions" />
  </div>
  <div class="grid grid-cols-[48px_1fr] border-b-hairline text-[11px] text-dim">
    <span>No.</span>
    <span>Name</span>
  </div>
  <div
    v-for="row in catalog.rows"
    :key="row.id"
    class="grid min-h-[31px] grid-cols-[48px_minmax(0,1fr)_auto] items-center border-b-hairline gap-1 hover:bg-panel"
  >
    <span class="font-mono text-[12px] text-dim">{{ row.id }}</span>
    <span class="truncate pr-2" :title="row.name">{{ row.name || '(unnamed)' }}</span>
    <slot :row="row" />
  </div>
  <p v-if="catalog.rows.length === 0" class="py-3 text-dim">Nothing found.</p>
  <div v-if="catalog.pages > 1" class="flex items-center justify-center py-2 gap-2">
    <UiButton :disabled="catalog.page === 0" @click="emit('page', catalog.page - 1)">
      Prev
    </UiButton>
    <span class="font-mono text-[12px]" aria-live="polite">
      {{ catalog.page + 1 }} / {{ catalog.pages }}
    </span>
    <UiButton
      :disabled="catalog.page + 1 === catalog.pages"
      @click="emit('page', catalog.page + 1)"
    >
      Next
    </UiButton>
  </div>
</template>
