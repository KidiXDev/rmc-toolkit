import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

const gridGapForOldChromium = plugin((api) => {
  api.matchUtilities(
    {
      gap: (value: string) => ({ 'grid-gap': value, gap: value }),
      'gap-x': (value: string) => ({ 'grid-column-gap': value, 'column-gap': value }),
      'gap-y': (value: string) => ({ 'grid-row-gap': value, 'row-gap': value }),
    },
    { values: api.theme('gap') },
  )
})

export default {
  content: ['./index.html', './launcher.html', './src/**/*.{vue,ts}'],
  corePlugins: { gap: false, preflight: false },
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      paper: 'var(--rmc-paper)',
      panel: 'var(--rmc-panel)',
      ink: 'var(--rmc-ink)',
      dim: 'var(--rmc-dim)',
      line: 'var(--rmc-line)',
      soft: 'var(--rmc-soft)',
      primary: 'var(--rmc-primary)',
      accent: 'var(--rmc-accent)',
      track: 'var(--rmc-track)',
      danger: 'var(--rmc-danger)',
    },
    fontFamily: {
      body: 'var(--rmc-font-body)',
      display: 'var(--rmc-font-display)',
      mono: 'var(--rmc-font-mono)',
    },
    borderRadius: {
      none: '0',
      control: 'var(--rmc-radius-control)',
      window: 'var(--rmc-radius-window)',
      full: '9999px',
    },
    boxShadow: {
      none: 'none',
      control: 'var(--rmc-shadow-control)',
      window: 'var(--rmc-shadow-window)',
    },
    extend: {
      borderWidth: {
        outline: 'var(--rmc-outline)',
        hairline: 'var(--rmc-hairline)',
      },
    },
  },
  plugins: [gridGapForOldChromium],
} satisfies Config
