<script setup lang="ts">
import { vFx } from '@/themes/activeEffects'

const { variant = 'plain', active = false } = defineProps<{
  variant?: 'plain' | 'primary' | 'danger'
  active?: boolean
}>()

const SHARED =
  'smooth rounded-control border-outline px-2.5 py-0.5 font-display text-[13px] font-extrabold italic whitespace-nowrap shadow-control enabled:hover:shadow-hover'

const PLAIN = 'border-ink bg-paper enabled:hover:bg-panel'
const ACTIVE = 'border-ink bg-soft'

const STRONG = {
  primary: 'border-ink bg-primary text-onfill enabled:hover:bg-primary-hover',
  danger: 'border-danger bg-paper text-danger enabled:hover:bg-panel',
}
</script>

<template>
  <button
    v-if="variant === 'plain'"
    v-fx:button
    type="button"
    :class="[SHARED, active ? ACTIVE : PLAIN]"
    :aria-pressed="active || undefined"
  >
    <slot />
  </button>
  <button v-else v-fx:action type="button" :class="[SHARED, STRONG[variant]]">
    <slot />
  </button>
</template>
