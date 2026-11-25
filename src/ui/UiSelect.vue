<script setup lang="ts" generic="T extends string | number">
import { computed, nextTick, ref, useId, useTemplateRef } from 'vue'

import UiPopup from './UiPopup.vue'

const { options } = defineProps<{
  label: string
  options: Array<{ value: T; label: string }>
}>()

const model = defineModel<T>({ required: true })

const TYPE_AHEAD_MS = 700

const listId = useId()
const trigger = useTemplateRef('trigger')
const list = useTemplateRef('list')
const isOpen = ref(false)
const highlighted = ref(0)

let typed = ''
let typedAt = 0
let returnsFocus = false

const selectedIndex = computed(() => options.findIndex((option) => option.value === model.value))
const selectedLabel = computed(() => options[selectedIndex.value]?.label ?? '')

async function open() {
  returnsFocus = trigger.value?.matches(':focus') ?? false
  highlighted.value = Math.max(0, selectedIndex.value)
  isOpen.value = true
  await nextTick()
  list.value?.focus({ preventScroll: true })
  showHighlighted()
}

function close() {
  isOpen.value = false
  if (returnsFocus) trigger.value?.focus({ preventScroll: true })
}

function toggle() {
  if (isOpen.value) close()
  else void open()
}

function choose(index: number) {
  const option = options[index]
  if (option) model.value = option.value
  close()
}

function showHighlighted() {
  list.value?.children[highlighted.value]?.scrollIntoView({ block: 'nearest' })
}

function highlight(index: number) {
  highlighted.value = Math.min(options.length - 1, Math.max(0, index))
  showHighlighted()
}

function typeAhead(key: string) {
  const now = Date.now()
  typed = now - typedAt > TYPE_AHEAD_MS ? key : typed + key
  typedAt = now
  const match = options.findIndex((option) =>
    option.label.toLowerCase().startsWith(typed.toLowerCase()),
  )
  if (match >= 0) highlight(match)
}

const KEY_ACTIONS: Record<string, () => void> = {
  ArrowDown: () => highlight(highlighted.value + 1),
  ArrowUp: () => highlight(highlighted.value - 1),
  Home: () => highlight(0),
  End: () => highlight(options.length - 1),
  Enter: () => choose(highlighted.value),
  ' ': () => choose(highlighted.value),
  Escape: close,
  Tab: close,
}

function onListKey(event: KeyboardEvent) {
  const action = KEY_ACTIONS[event.key]
  event.stopPropagation()
  if (action) {
    event.preventDefault()
    action()
  } else if (event.key.length === 1) {
    typeAhead(event.key)
  }
}

function onTriggerKey(event: KeyboardEvent) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  event.preventDefault()
  void open()
}
</script>

<template>
  <button
    ref="trigger"
    type="button"
    class="smooth min-w-[128px] rounded-control border-outline border-ink bg-paper px-2.5 py-0.5 text-left text-[13px] enabled:hover:bg-panel"
    :class="isOpen && 'bg-panel'"
    aria-haspopup="listbox"
    :aria-expanded="isOpen"
    :aria-label="`${label}: ${selectedLabel}`"
    :disabled="options.length === 0"
    @click="toggle"
    @keydown="onTriggerKey"
  >
    <span class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
      <span class="truncate">{{ selectedLabel }}</span>
      <svg
        viewBox="0 0 10 6"
        aria-hidden="true"
        class="h-1.5 w-2.5 fill-none stroke-ink transition-transform"
        :class="isOpen && 'rotate-180'"
      >
        <path d="M1 1l4 4 4-4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>
  </button>
  <UiPopup :anchor="trigger" :open="isOpen" match-width @close="isOpen = false">
    <ul
      ref="list"
      role="listbox"
      tabindex="-1"
      class="m-0 max-h-[220px] list-none overflow-y-auto rounded-control border-outline border-ink bg-paper p-1 text-[13px] shadow-control"
      :aria-label="label"
      :aria-activedescendant="`${listId}-${highlighted}`"
      @keydown="onListKey"
    >
      <li
        v-for="(option, index) in options"
        :id="`${listId}-${index}`"
        :key="option.value"
        role="option"
        class="pop-row grid cursor-pointer grid-cols-[14px_minmax(0,1fr)] items-center whitespace-nowrap rounded-[5px] px-1.5 py-1 gap-1.5"
        :class="[index === highlighted && 'bg-soft', index === selectedIndex && 'font-bold']"
        :style="{ '--row': Math.min(index, 8) }"
        :aria-selected="index === selectedIndex"
        @mousemove="highlighted = index"
        @click="choose(index)"
      >
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          class="h-3 w-3 fill-none stroke-ink"
          stroke-width="4"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path v-if="index === selectedIndex" d="M3.5 10.5l4.5 4.5 8.5-10" />
        </svg>
        {{ option.label }}
      </li>
    </ul>
  </UiPopup>
</template>
