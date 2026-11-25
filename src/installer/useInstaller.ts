import { computed, ref } from 'vue'

import {
  forgetGame,
  inspectGame,
  installGame,
  listGames,
  toolkitVersion,
  uninstallGame,
  type GameInfo,
} from './api'

export interface Message {
  text: string
  tone: 'info' | 'error'
}

export function useInstaller() {
  const games = ref<GameInfo[]>([])
  const selected = ref<GameInfo | null>(null)
  const message = ref<Message | null>(null)
  const version = ref('')
  const isBusy = ref(false)
  const progress = ref<number | null>(null)

  const outdated = computed(() => games.value.filter((game) => game.status === 'outdated'))

  async function run(action: () => Promise<string | null>) {
    if (isBusy.value) return
    isBusy.value = true
    message.value = null
    try {
      const text = await action()
      if (text !== null) message.value = { text, tone: 'info' }
    } catch (error) {
      message.value = { text: String(error), tone: 'error' }
    } finally {
      isBusy.value = false
    }
  }

  async function refresh() {
    games.value = await listGames()
  }

  const start = () =>
    run(async () => {
      version.value = await toolkitVersion()
      await refresh()
      return null
    })

  const select = (path: string) =>
    run(async () => {
      selected.value = null
      selected.value = await inspectGame(path)
      return null
    })

  const install = (path: string) =>
    run(async () => {
      selected.value = await installGame(path)
      await refresh()
      return 'Installed. Start the game and press Ctrl+C.'
    })

  const uninstall = (path: string, removeSettings: boolean) =>
    run(async () => {
      selected.value = await uninstallGame(path, removeSettings)
      await refresh()
      return 'Removed. The game is back to its original files.'
    })

  const forget = (path: string) =>
    run(async () => {
      await forgetGame(path)
      await refresh()
      return null
    })

  const updateAll = () =>
    run(async () => {
      const targets = outdated.value
      const failures: string[] = []
      progress.value = 0
      for (const [index, game] of targets.entries()) {
        await installGame(game.path).catch((error: unknown) => {
          failures.push(`${game.title}: ${String(error)}`)
        })
        progress.value = Math.round(((index + 1) / targets.length) * 100)
      }
      await refresh()
      progress.value = null
      if (failures.length > 0) throw new Error(failures.join('\n'))
      return `Updated ${targets.length} ${targets.length === 1 ? 'game' : 'games'}.`
    })

  return {
    games,
    selected,
    message,
    version,
    isBusy,
    progress,
    outdated,
    start,
    select,
    install,
    uninstall,
    forget,
    updateAll,
  }
}
