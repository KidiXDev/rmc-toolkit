<script setup lang="ts">
import { vFx } from '@/themes/activeEffects'

defineProps<{ message: string; tone: 'info' | 'error' }>()
const emit = defineEmits<{ dismiss: [] }>()
</script>

<template>
  <div
    v-fx:toast
    class="pointer-events-auto mt-2 grid w-[250px] grid-cols-[20px_1fr_18px] items-center rounded-control border-outline border-ink bg-paper px-2.5 py-1.5 font-bold shadow-control gap-2"
    :role="tone === 'error' ? 'alert' : 'status'"
  >
    <span
      class="grid h-5 w-5 place-items-center rounded-full border-outline border-ink text-[11px] font-extrabold"
      :class="tone === 'error' ? 'bg-accent' : 'bg-primary'"
      aria-hidden="true"
    >
      {{ tone === 'error' ? '!' : '✓' }}
    </span>
    {{ message }}
    <button type="button" aria-label="Dismiss" @click="emit('dismiss')">✕</button>
  </div>
</template>
