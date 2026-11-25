import { defineStore } from 'pinia'
import { reactive, toRefs, watch } from 'vue'

import { FILTERS, SORTS, type Filter, type Sort } from './librarySort'

const STORAGE_KEY = 'rmc-launcher'

export const LAYOUTS = ['grid', 'list'] as const
export type Layout = (typeof LAYOUTS)[number]

export interface Preferences {
  theme: string
  effects: boolean
  layout: Layout
  filter: Filter
  sort: Sort
  backupBeforePlay: boolean
  minimizeOnPlay: boolean
  installOnAdd: boolean
}

const DEFAULTS: Preferences = {
  theme: 'sakuga',
  effects: true,
  layout: 'grid',
  filter: 'all',
  sort: 'recent',
  backupBeforePlay: true,
  minimizeOnPlay: false,
  installOnAdd: false,
}

function oneOf<T extends string>(options: readonly T[], value: unknown, fallback: T): T {
  return options.find((option) => option === value) ?? fallback
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function sanitizePreferences(raw: unknown): Preferences {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULTS }
  const saved: Partial<Record<keyof Preferences, unknown>> = raw

  return {
    theme: typeof saved.theme === 'string' ? saved.theme : DEFAULTS.theme,
    effects: flag(saved.effects, DEFAULTS.effects),
    layout: oneOf(LAYOUTS, saved.layout, DEFAULTS.layout),
    filter: oneOf(FILTERS, saved.filter, DEFAULTS.filter),
    sort: oneOf(SORTS, saved.sort, DEFAULTS.sort),
    backupBeforePlay: flag(saved.backupBeforePlay, DEFAULTS.backupBeforePlay),
    minimizeOnPlay: flag(saved.minimizeOnPlay, DEFAULTS.minimizeOnPlay),
    installOnAdd: flag(saved.installOnAdd, DEFAULTS.installOnAdd),
  }
}

function readSaved(): unknown {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')
  } catch {
    return null
  }
}

export const usePreferences = defineStore('preferences', () => {
  const state = reactive(sanitizePreferences(readSaved()))
  watch(state, () => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)))
  return toRefs(state)
})
