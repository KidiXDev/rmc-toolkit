import { defineConfig, mergeConfig } from 'vite'

import baseConfig from './vite.config.ts'

export default defineConfig((env) =>
  mergeConfig(baseConfig(env), {
    publicDir: false,
    clearScreen: false,
    server: { port: 1420, strictPort: true },
    build: {
      outDir: 'dist-launcher',
      rolldownOptions: { input: 'launcher.html' },
    },
  }),
)
