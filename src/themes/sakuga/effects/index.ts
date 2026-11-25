import type { ThemeEffects } from '../../types'
import { mountStage } from '../vfx/stage'
import { attachAction, attachButton } from './buttons'
import { attachCheckbox, attachToggle } from './choices'
import { attachInput, attachSlider } from './fields'
import { attachProgress, attachTabs, attachToast, attachTooltip } from './surfaces'

export const SAKUGA_EFFECTS: ThemeEffects = {
  mount: mountStage,
  attach: {
    action: attachAction,
    button: attachButton,
    toggle: attachToggle,
    checkbox: attachCheckbox,
    slider: attachSlider,
    input: attachInput,
    tabs: attachTabs,
    toast: attachToast,
    tooltip: attachTooltip,
    progress: attachProgress,
  },
}
