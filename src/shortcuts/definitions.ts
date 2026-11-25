import { forceBattleResult, weakenEnemies, type BattleResult } from '@/cheats/battle'
import { recoverParty, setPartyGodMode, woundParty } from '@/cheats/party'
import { gotoTitle, openDevTools, quickLoad, quickSave } from '@/cheats/scene'
import { setFastForward } from '@/cheats/speed'
import { useCheats } from '@/stores/cheats'
import { useOverlay } from '@/stores/overlay'
import { useSettings } from '@/stores/settings'

export interface ShortcutDefinition {
  id: string
  label: string
  defaultCombo: string
  run(): void
  release?(): void
}

function notify(message: string): void {
  useOverlay().notify(message)
}

function notifyError(message: string): void {
  useOverlay().notify(message, 'error')
}

function forceResult(result: BattleResult): void {
  if (!forceBattleResult(result)) notifyError('Not in battle')
}

async function save(): Promise<void> {
  const slot = useSettings().saveSlot
  const saved = await quickSave(slot).catch(() => false)
  if (saved) notify(`Saved to slot ${slot}`)
  else notifyError('Quick save works only on the map')
}

async function load(): Promise<void> {
  const slot = useSettings().saveSlot
  const loaded = await quickLoad(slot).catch(() => false)
  if (loaded) notify(`Loaded slot ${slot}`)
  else notifyError(`Could not load slot ${slot}`)
}

function toggleNoClip(): void {
  const cheats = useCheats()
  cheats.noClip = !cheats.noClip
  notify(cheats.noClip ? 'No-clip on' : 'No-clip off')
}

function toggleGodMode(): void {
  const enabled = !useCheats().godParty
  setPartyGodMode(enabled)
  notify(enabled ? 'God mode on' : 'God mode off')
}

function toggleEncounters(): void {
  const cheats = useCheats()
  cheats.noEncounters = !cheats.noEncounters
  notify(cheats.noEncounters ? 'Encounters off' : 'Encounters on')
}

export const SHORTCUTS: ShortcutDefinition[] = [
  {
    id: 'toggleWindow',
    label: 'Show or hide window',
    defaultCombo: 'Control+C',
    run: () => useOverlay().toggle(),
  },
  { id: 'quickSave', label: 'Quick save', defaultCombo: 'Control+S', run: () => void save() },
  { id: 'quickLoad', label: 'Quick load', defaultCombo: 'Control+L', run: () => void load() },
  { id: 'noClip', label: 'Toggle no-clip', defaultCombo: 'Control+N', run: toggleNoClip },
  {
    id: 'fastForward',
    label: 'Fast-forward (hold)',
    defaultCombo: '`',
    run: () => setFastForward(true),
    release: () => setFastForward(false),
  },
  { id: 'godMode', label: 'Toggle god mode', defaultCombo: '', run: toggleGodMode },
  { id: 'encounters', label: 'Toggle encounters', defaultCombo: '', run: toggleEncounters },
  {
    id: 'recover',
    label: 'Recover party',
    defaultCombo: '',
    run: () => {
      recoverParty()
      notify('Party recovered')
    },
  },
  {
    id: 'wound',
    label: 'Wound party',
    defaultCombo: '',
    run: () => {
      woundParty()
      notify('Party wounded')
    },
  },
  { id: 'weaken', label: 'Enemies to 1 HP', defaultCombo: '', run: weakenEnemies },
  { id: 'victory', label: 'Win battle', defaultCombo: '', run: () => forceResult('victory') },
  { id: 'defeat', label: 'Lose battle', defaultCombo: '', run: () => forceResult('defeat') },
  { id: 'escape', label: 'Escape battle', defaultCombo: '', run: () => forceResult('escape') },
  { id: 'title', label: 'Go to title', defaultCombo: '', run: () => void gotoTitle() },
  {
    id: 'devTools',
    label: 'Open DevTools',
    defaultCombo: 'F12',
    run: () => {
      if (!openDevTools()) notifyError('DevTools need an NW.js SDK build')
    },
  },
]
