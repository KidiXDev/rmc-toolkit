import { rpg } from '@/engine/runtime'

export interface SwitchEntry {
  id: number
  name: string
  value: boolean
}

export interface VariableEntry {
  id: number
  name: string
  value: unknown
}

function namedIds(names: Array<string | null> | undefined) {
  return (names ?? []).map((name, id) => ({ id, name: name ?? '' })).slice(1)
}

export function switchEntries(): SwitchEntry[] {
  return namedIds(rpg.$dataSystem?.switches).map((entry) => ({
    ...entry,
    value: rpg.$gameSwitches?.value(entry.id) ?? false,
  }))
}

export function setSwitch(id: number, value: boolean): void {
  rpg.$gameSwitches?.setValue(id, value)
}

export function variableEntries(): VariableEntry[] {
  return namedIds(rpg.$dataSystem?.variables).map((entry) => ({
    ...entry,
    value: rpg.$gameVariables?.value(entry.id) ?? 0,
  }))
}

export function setVariable(id: number, value: unknown): void {
  rpg.$gameVariables?.setValue(id, value)
}

export function isEditableVariable(value: unknown): value is string | number | boolean {
  return ['string', 'number', 'boolean'].includes(typeof value)
}

export function parseVariable(text: string): string | number | boolean {
  const trimmed = text.trim()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed !== '' && Number.isFinite(Number(trimmed))) return Number(trimmed)
  return text
}
