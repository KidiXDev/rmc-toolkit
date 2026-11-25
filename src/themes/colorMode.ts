import { onScopeDispose, readonly, ref, type Ref } from 'vue'

export const COLOR_MODES = ['system', 'light', 'dark'] as const
export type ColorMode = (typeof COLOR_MODES)[number]
export type ShownMode = Exclude<ColorMode, 'system'>

export const COLOR_MODE_OPTIONS: Array<{ value: ColorMode; label: string }> = [
  { value: 'system', label: 'Same as system' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function readColorMode(value: unknown): ColorMode {
  return COLOR_MODES.find((mode) => mode === value) ?? 'system'
}

export function useSystemMode(): Readonly<Ref<ShownMode>> {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
  const current = (): ShownMode => (prefersDark.matches ? 'dark' : 'light')
  const mode = ref(current())

  function update() {
    mode.value = current()
  }

  prefersDark.addEventListener('change', update)
  onScopeDispose(() => prefersDark.removeEventListener('change', update))
  return readonly(mode)
}
