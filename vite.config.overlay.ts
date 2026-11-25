import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { defineConfig, mergeConfig } from 'vite'

import packageJson from './package.json' with { type: 'json' }
import baseConfig from './vite.config.ts'

const polyfills = readFileSync(
  fileURLToPath(new URL('./src/overlay/polyfills.js', import.meta.url)),
  'utf8',
)

export default defineConfig((env) =>
  mergeConfig(baseConfig(env), {
    publicDir: false,
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      __VUE_OPTIONS_API__: 'false',
    },
    build: {
      target: 'chrome65',
      cssTarget: 'chrome65',
      lib: {
        entry: 'src/overlay/main.ts',
        formats: ['iife'],
        name: 'RmcCheatToolkit',
        fileName: () => 'cheat.js',
      },
      rolldownOptions: {
        output: {
          postBanner: `/*! rmc-cheat-toolkit ${packageJson.version} */\n${polyfills}`,
        },
      },
    },
  }),
)
