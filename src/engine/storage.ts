import { rpg } from './runtime'
import type { NodeModules } from './types'

const SETTINGS_FOLDER = 'cheat-settings'
const MAX_LOG_BYTES = 1024 * 1024
const MAX_BYTES_PER_CHAR = 3
const KEPT_LOG_CHARS = MAX_LOG_BYTES / 4

export interface CheatStorage {
  read(name: string): unknown
  write(name: string, value: unknown): void
  append(name: string, text: string): void
}

function parseJson(text: string | null): unknown {
  if (text === null) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function newestLines(text: string, maxChars: number): string {
  const tail = text.slice(-maxChars)
  return tail.slice(tail.indexOf('\n') + 1)
}

function createFileStorage({ fs, path }: NodeModules, gameFolder: string): CheatStorage {
  const folder = path.join(gameFolder, SETTINGS_FOLDER)
  const fileOf = (name: string) => path.join(folder, `${name}.json`)

  function ensureFolder() {
    if (!fs.existsSync(folder)) fs.mkdirSync(folder)
  }

  return {
    read(name) {
      const file = fileOf(name)
      return parseJson(fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null)
    },
    write(name, value) {
      ensureFolder()
      const file = fileOf(name)
      const pending = `${file}.tmp`
      fs.writeFileSync(pending, JSON.stringify(value, null, 2), 'utf8')
      fs.renameSync(pending, file)
    },
    append(name, text) {
      ensureFolder()
      const file = path.join(folder, `${name}.log`)
      const size = fs.existsSync(file) ? fs.statSync(file).size : 0
      if (size + text.length * MAX_BYTES_PER_CHAR > MAX_LOG_BYTES) {
        const kept = newestLines(fs.readFileSync(file, 'utf8'), KEPT_LOG_CHARS)
        fs.writeFileSync(file, kept, 'utf8')
      }
      fs.appendFileSync(file, text, 'utf8')
    },
  }
}

function createBrowserStorage(): CheatStorage {
  return {
    read: (name) => parseJson(window.localStorage.getItem(name)),
    write: (name, value) => window.localStorage.setItem(name, JSON.stringify(value)),
    append() {},
  }
}

export function createStorage(): CheatStorage {
  const mainFile = rpg.process?.mainModule?.filename
  if (!rpg.require || !mainFile) return createBrowserStorage()

  try {
    const modules = { fs: rpg.require('fs'), path: rpg.require('path') }
    return createFileStorage(modules, modules.path.dirname(mainFile))
  } catch {
    return createBrowserStorage()
  }
}
