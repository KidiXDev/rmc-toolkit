import { computed, type Component } from 'vue'

import EspOverlay from '@/extras/EspOverlay.vue'
import EventsPanel from '@/extras/EventsPanel.vue'
import HudOverlay from '@/extras/HudOverlay.vue'
import HudPanel from '@/extras/HudPanel.vue'
import LocationsPanel from '@/extras/LocationsPanel.vue'
import MinimapOverlay from '@/extras/MinimapOverlay.vue'
import MinimapPanel from '@/extras/MinimapPanel.vue'
import TeleportPanel from '@/extras/TeleportPanel.vue'
import type { ExtraId } from '@/stores/sanitize'
import { useSettings } from '@/stores/settings'

import { EXTRAS } from './extras'
import BattlePanel from './panels/BattlePanel.vue'
import GeneralPanel from './panels/GeneralPanel.vue'
import InventoryPanel from './panels/InventoryPanel.vue'
import PartyPanel from './panels/PartyPanel.vue'
import SettingsPanel from './panels/SettingsPanel.vue'
import ShortcutsPanel from './panels/ShortcutsPanel.vue'
import SwitchesPanel from './panels/SwitchesPanel.vue'
import VariablesPanel from './panels/VariablesPanel.vue'

interface Feature {
  id: string
  label: string
  panel?: Component
  overlay?: Component
  extra?: ExtraId
}

function extraFeature(extra: ExtraId, parts: Pick<Feature, 'panel' | 'overlay'>): Feature {
  return { id: extra, label: EXTRAS[extra].label, extra, ...parts }
}

const FEATURES: Feature[] = [
  { id: 'general', label: 'General', panel: GeneralPanel },
  { id: 'party', label: 'Party', panel: PartyPanel },
  { id: 'battle', label: 'Battle', panel: BattlePanel },
  { id: 'inventory', label: 'Inventory', panel: InventoryPanel },
  { id: 'switches', label: 'Switches', panel: SwitchesPanel },
  { id: 'variables', label: 'Variables', panel: VariablesPanel },
  extraFeature('teleport', { panel: TeleportPanel }),
  extraFeature('locations', { panel: LocationsPanel }),
  extraFeature('minimap', { panel: MinimapPanel, overlay: MinimapOverlay }),
  extraFeature('esp', { overlay: EspOverlay }),
  extraFeature('events', { panel: EventsPanel }),
  extraFeature('hud', { panel: HudPanel, overlay: HudOverlay }),
  { id: 'shortcuts', label: 'Shortcuts', panel: ShortcutsPanel },
  { id: 'settings', label: 'Settings', panel: SettingsPanel },
]

export function useFeatures() {
  const settings = useSettings()
  const enabled = computed(() =>
    FEATURES.filter((feature) => !feature.extra || settings.extras[feature.extra]),
  )

  return {
    tabs: computed(() => enabled.value.filter((feature) => feature.panel)),
    overlays: computed(() => enabled.value.filter((feature) => feature.overlay)),
  }
}
