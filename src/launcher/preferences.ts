import { defineStore } from 'pinia'
import { reactive, toRefs, watch } from 'vue'

import { readColorMode, type ColorMode } from '@/themes/colorMode'

import {
  FILTERS,
  SORTS,
  STATUS_FILTERS,
  type Filter,
  type Sort,
  type StatusFilter,
} from './librarySort'

const STORAGE_KEY = 'rmc-launcher'

export const LAYOUTS = ['grid', 'list'] as const
export type Layout = (typeof LAYOUTS)[number]

export interface Preferences {
  theme: string
  colorMode: ColorMode
  effects: boolean
  layout: Layout
  filter: Filter
  sort: Sort
  statusFilter: StatusFilter
  backupBeforePlay: boolean
  minimizeOnPlay: boolean
  installOnAdd: boolean
  restoreAfterPlay: boolean
  staysInTray: boolean
  developerMode: boolean
}

const DEFAULTS: Preferences = {
  theme: 'sakuga',
  colorMode: 'system',
  effects: true,
  layout: 'grid',
  filter: 'all',
  sort: 'recent',
  statusFilter: 'any',
  backupBeforePlay: true,
  minimizeOnPlay: false,
  installOnAdd: false,
  restoreAfterPlay: false,
  staysInTray: false,
  developerMode: false,
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
    colorMode: readColorMode(saved.colorMode),
    effects: flag(saved.effects, DEFAULTS.effects),
    layout: oneOf(LAYOUTS, saved.layout, DEFAULTS.layout),
    filter: oneOf(FILTERS, saved.filter, DEFAULTS.filter),
    sort: oneOf(SORTS, saved.sort, DEFAULTS.sort),
    statusFilter: oneOf(STATUS_FILTERS, saved.statusFilter, DEFAULTS.statusFilter),
    backupBeforePlay: flag(saved.backupBeforePlay, DEFAULTS.backupBeforePlay),
    minimizeOnPlay: flag(saved.minimizeOnPlay, DEFAULTS.minimizeOnPlay),
    installOnAdd: flag(saved.installOnAdd, DEFAULTS.installOnAdd),
    restoreAfterPlay: flag(saved.restoreAfterPlay, DEFAULTS.restoreAfterPlay),
    staysInTray: flag(saved.staysInTray, DEFAULTS.staysInTray),
    developerMode: flag(saved.developerMode, DEFAULTS.developerMode),
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
