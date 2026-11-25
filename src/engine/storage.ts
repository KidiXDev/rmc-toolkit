import { rpg } from './runtime'
import type { NodeModules } from './types'

const SETTINGS_FOLDER = 'cheat-settings'

export interface CheatStorage {
  read(name: string): unknown
  write(name: string, value: unknown): void
}

function parseJson(text: string | null): unknown {
  if (text === null) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function createFileStorage({ fs, path }: NodeModules, gameFolder: string): CheatStorage {
  const folder = path.join(gameFolder, SETTINGS_FOLDER)
  const fileOf = (name: string) => path.join(folder, `${name}.json`)

  return {
    read(name) {
      const file = fileOf(name)
      return parseJson(fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null)
    },
    write(name, value) {
      if (!fs.existsSync(folder)) fs.mkdirSync(folder)
      const file = fileOf(name)
      const pending = `${file}.tmp`
      fs.writeFileSync(pending, JSON.stringify(value, null, 2), 'utf8')
      fs.renameSync(pending, file)
    },
  }
}

function createBrowserStorage(): CheatStorage {
  return {
    read: (name) => parseJson(window.localStorage.getItem(name)),
    write: (name, value) => window.localStorage.setItem(name, JSON.stringify(value)),
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
