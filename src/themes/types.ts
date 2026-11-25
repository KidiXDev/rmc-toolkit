export type FxKind =
  | 'action'
  | 'button'
  | 'toggle'
  | 'checkbox'
  | 'slider'
  | 'input'
  | 'tabs'
  | 'toast'
  | 'tooltip'
  | 'progress'

export type FxAttach = (element: HTMLElement) => () => void

export interface ThemeEffects {
  mount(layer: HTMLElement): () => void
  attach: Record<FxKind, FxAttach>
}

export interface Theme {
  id: string
  label: string
  hasDarkMode: boolean
  effects?: ThemeEffects
}
