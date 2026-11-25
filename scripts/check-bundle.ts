import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { parse } from 'acorn'

const NEWEST_SYNTAX_IN_CHROMIUM_65 = 2018

const UNSUPPORTED_CSS: Record<string, RegExp> = {
  '@layer': /@layer\b/,
  'color-mix()': /color-mix\(/,
  'inset shorthand': /[;{"`\s]inset:/,
  ':is() / :where() / :has()': /:(?:is|where|has)\(/,
  'logical properties': /(?:padding|margin)-(?:inline|block)/,
  'individual transforms': /[;{](?:translate|rotate|scale):/,
}

const bundlePath = fileURLToPath(new URL('../dist/cheat.js', import.meta.url))
const bundle = readFileSync(bundlePath, 'utf8')

parse(bundle, { ecmaVersion: NEWEST_SYNTAX_IN_CHROMIUM_65, sourceType: 'script' })

const problems = Object.entries(UNSUPPORTED_CSS)
  .map(([label, pattern]) => ({ label, match: pattern.exec(bundle) }))
  .flatMap(({ label, match }) =>
    match ? [`${label}: ${bundle.slice(Math.max(0, match.index - 40), match.index + 60)}`] : [],
  )

if (problems.length > 0) {
  console.error(`cheat.js is not safe for Chromium 65:\n${problems.join('\n')}`)
  process.exit(1)
}

console.log(`cheat.js is safe for Chromium 65 (${(bundle.length / 1024).toFixed(0)} KB)`)
