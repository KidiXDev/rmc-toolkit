<script setup lang="ts">
import { vFx } from '@/themes/activeEffects'

const { variant = 'plain', active = false } = defineProps<{
  variant?: 'plain' | 'primary' | 'danger'
  active?: boolean
}>()

const VARIANT_CLASSES = {
  plain: 'border-ink bg-paper',
  primary: 'border-ink bg-primary',
  danger: 'border-danger bg-paper text-danger',
}
</script>

<template>
  <button
    v-if="variant === 'plain'"
    v-fx:button
    type="button"
    class="whitespace-nowrap rounded-control border-outline px-2.5 py-0.5 font-display text-[13px] font-extrabold italic shadow-control"
    :class="[VARIANT_CLASSES.plain, active && 'bg-soft']"
    :aria-pressed="active || undefined"
  >
    <slot />
  </button>
  <button
    v-else
    v-fx:action
    type="button"
    class="whitespace-nowrap rounded-control border-outline px-2.5 py-0.5 font-display text-[13px] font-extrabold italic shadow-control"
    :class="VARIANT_CLASSES[variant]"
  >
    <slot />
  </button>
</template>
