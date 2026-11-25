import { defineStore } from 'pinia'
import { reactive, toRefs } from 'vue'

interface CheatState {
  moveSpeed: number | null
  noClip: boolean
  noEncounters: boolean
  gameSpeed: number
  battleSpeed: number
  fastForward: boolean
  expMultiplier: number
  damageMultiplier: number
  godParty: boolean
  godActorIds: number[]
}

export const useCheats = defineStore('cheats', () =>
  toRefs(
    reactive<CheatState>({
      moveSpeed: null,
      noClip: false,
      noEncounters: false,
      gameSpeed: 1,
      battleSpeed: 1,
      fastForward: false,
      expMultiplier: 1,
      damageMultiplier: 1,
      godParty: false,
      godActorIds: [],
    }),
  ),
)
