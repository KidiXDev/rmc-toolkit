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
      primary: { DEFAULT: 'var(--rmc-primary)', hover: 'var(--rmc-primary-hover)' },
      accent: { DEFAULT: 'var(--rmc-accent)', hover: 'var(--rmc-accent-hover)' },
      track: 'var(--rmc-track)',
      danger: 'var(--rmc-danger)',
      onfill: 'var(--rmc-on-fill)',
      chrome: { DEFAULT: 'var(--rmc-chrome)', hover: 'var(--rmc-chrome-hover)' },
      onchrome: { DEFAULT: 'var(--rmc-on-chrome)', dim: 'var(--rmc-on-chrome-dim)' },
      scrim: 'var(--rmc-scrim)',
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
      hover: 'var(--rmc-shadow-hover)',
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
