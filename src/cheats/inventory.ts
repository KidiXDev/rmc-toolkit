import { rpg } from '@/engine/runtime'
import type { DataItem } from '@/engine/types'

export const INVENTORY_KINDS = ['items', 'weapons', 'armors'] as const
export type InventoryKind = (typeof INVENTORY_KINDS)[number]

const DATA_KEYS = {
  items: '$dataItems',
  weapons: '$dataWeapons',
  armors: '$dataArmors',
} as const

export interface InventoryEntry {
  id: number
  name: string
  description: string
  quantity: number
  max: number
}

const DIVIDER_NAME = /^\s*[-=_*~#─━]{2,}|^[^\p{L}\p{N}]*$/u

function isRealItem(item: DataItem | null): item is DataItem {
  return item !== null && !DIVIDER_NAME.test(item.name)
}

function realItems(kind: InventoryKind): DataItem[] {
  return (rpg[DATA_KEYS[kind]] ?? []).filter(isRealItem)
}

export function inventoryEntries(kind: InventoryKind): InventoryEntry[] {
  const party = rpg.$gameParty
  if (!party) return []

  return realItems(kind).map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description ?? '',
    quantity: party.numItems(item),
    max: party.maxItems(item),
  }))
}

export function setQuantity(kind: InventoryKind, id: number, quantity: number): void {
  const party = rpg.$gameParty
  const item = rpg[DATA_KEYS[kind]]?.[id]
  if (!party || !item) return
  party.gainItem(item, Math.max(0, quantity) - party.numItems(item), false)
}

export function maxAll(kind: InventoryKind): void {
  const party = rpg.$gameParty
  if (!party) return
  for (const item of realItems(kind)) {
    party.gainItem(item, party.maxItems(item) - party.numItems(item), false)
  }
}
