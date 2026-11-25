import { rpg } from '@/engine/runtime'

export function gold(): number {
  return rpg.$gameParty?.gold() ?? 0
}

export function maxGold(): number {
  return rpg.$gameParty?.maxGold() ?? 0
}

export function setGold(amount: number): void {
  const party = rpg.$gameParty
  party?.gainGold(amount - party.gold())
}
