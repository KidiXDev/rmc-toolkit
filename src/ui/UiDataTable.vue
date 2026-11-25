<script setup lang="ts" generic="T extends { id: number; name: string }">
import { computed, ref, watch } from 'vue'

import UiButton from './UiButton.vue'
import UiTextField from './UiTextField.vue'

const PAGE_SIZE = 50

type SortKey = 'id' | 'name'

const { rows, searchLabel = 'Search by name or number' } = defineProps<{
  rows: T[]
  searchLabel?: string
}>()

defineSlots<{
  default(props: { row: T }): unknown
  actions?(): unknown
}>()

const query = ref('')
const page = ref(0)
const sortKey = ref<SortKey>('id')
const isDescending = ref(false)

const matches = computed(() => {
  const text = query.value.trim().toLowerCase()
  if (!text) return rows
  return rows.filter((row) => String(row.id) === text || row.name.toLowerCase().includes(text))
})

const sorted = computed(() => {
  const direction = isDescending.value ? -1 : 1
  return [...matches.value].sort((a, b) => {
    const order =
      sortKey.value === 'id'
        ? a.id - b.id
        : a.name.localeCompare(b.name, undefined, { numeric: true })
    return order * direction
  })
})

const lastPage = computed(() => Math.max(0, Math.ceil(sorted.value.length / PAGE_SIZE) - 1))
const currentPage = computed(() => Math.min(page.value, lastPage.value))
const visible = computed(() =>
  sorted.value.slice(currentPage.value * PAGE_SIZE, (currentPage.value + 1) * PAGE_SIZE),
)

watch([query, sortKey, isDescending], () => {
  page.value = 0
})

function sortBy(key: SortKey) {
  isDescending.value = sortKey.value === key && !isDescending.value
  sortKey.value = key
}

function sortMark(key: SortKey) {
  if (sortKey.value !== key) return ''
  return isDescending.value ? '▼' : '▲'
}
</script>

<template>
  <div>
    <div class="mb-1.5 grid grid-cols-[1fr_auto] items-center gap-2">
      <UiTextField v-model="query" :label="searchLabel" :placeholder="searchLabel" />
      <slot name="actions" />
    </div>
    <div class="grid grid-cols-[52px_1fr_auto] border-b-hairline text-[11px] text-dim">
      <button type="button" class="text-left hover:text-ink" @click="sortBy('id')">
        No. {{ sortMark('id') }}
      </button>
      <button type="button" class="text-left hover:text-ink" @click="sortBy('name')">
        Name {{ sortMark('name') }}
      </button>
    </div>
    <div
      v-for="row in visible"
      :key="row.id"
      class="smooth grid min-h-[31px] grid-cols-[52px_1fr_auto] items-center border-b-hairline hover:bg-panel"
    >
      <span class="font-mono text-[12px] text-dim">{{ row.id }}</span>
      <span class="truncate pr-2" :title="row.name">{{ row.name || '(unnamed)' }}</span>
      <slot :row="row" />
    </div>
    <p v-if="visible.length === 0" class="py-3 text-dim">Nothing found.</p>
    <div v-if="lastPage > 0" class="grid grid-flow-col items-center justify-center py-1.5 gap-2">
      <UiButton :disabled="currentPage === 0" @click="page = currentPage - 1">Prev</UiButton>
      <span class="font-mono text-[12px]">{{ currentPage + 1 }} / {{ lastPage + 1 }}</span>
      <UiButton :disabled="currentPage === lastPage" @click="page = currentPage + 1">
        Next
      </UiButton>
    </div>
  </div>
</template>
