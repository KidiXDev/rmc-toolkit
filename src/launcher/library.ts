import { getCurrentWindow } from '@tauri-apps/api/window'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { createToasts } from '@/stores/toasts'

import * as api from './api'
import type { FoundGame, GameEnded, GameInfo, PlaySession, PlayStatus } from './api'
import { countLabel, formatDuration } from './format'
import { useNavigation } from './navigation'
import { usePreferences } from './preferences'

async function showWindow() {
  const appWindow = getCurrentWindow()
  await appWindow.show()
  await appWindow.unminimize()
  await appWindow.setFocus()
}

export const useLibrary = defineStore('library', () => {
  const navigation = useNavigation()
  const preferences = usePreferences()
  const { toasts, notify, dismissToast } = createToasts()

  const games = ref<GameInfo[]>([])
  const pastSessions = ref<PlaySession[]>([])
  const fetchedAt = ref(Date.now())
  const version = ref('')
  const isLoaded = ref(false)
  const busyIds = ref(new Set<string>())
  const progress = ref<number | null>(null)
  const found = ref<FoundGame[] | null>(null)
  const isScanning = ref(false)

  const outdated = computed(() => games.value.filter((game) => game.status === 'outdated'))
  const running = computed(() => games.value.filter((game) => game.session !== null))
  const favorites = computed(() => games.value.filter((game) => game.favorite))

  const sessions = computed(() => [
    ...pastSessions.value,
    ...games.value.flatMap((game) => (game.session ? [game.session] : [])),
  ])

  const gameById = (id: string) => games.value.find((game) => game.id === id)

  async function attempt(action: () => Promise<unknown>): Promise<boolean> {
    try {
      await action()
      return true
    } catch (error) {
      notify(String(error), 'error')
      return false
    }
  }

  async function refresh() {
    const [listed, past] = await Promise.all([api.listGames(), api.listSessions()])
    games.value = listed
    pastSessions.value = past
    fetchedAt.value = Date.now()
    isLoaded.value = true
  }

  async function change(id: string, action: () => Promise<unknown>, done?: string) {
    if (busyIds.value.has(id)) return false
    busyIds.value.add(id)
    const succeeded = await attempt(action)
    busyIds.value.delete(id)
    await attempt(refresh)
    if (succeeded && done) notify(done)
    return succeeded
  }

  async function start() {
    await attempt(async () => {
      version.value = await api.toolkitVersion()
      await refresh()
    })
  }

  async function add(paths: string[]) {
    await attempt(async () => {
      const { added, failed } = await api.addGames(paths)
      if (preferences.installOnAdd) {
        for (const id of added) await attempt(() => api.installCheats(id))
      }
      await refresh()
      for (const reason of failed) notify(reason, 'error')

      const [first] = added
      if (first !== undefined && added.length === 1) navigation.openGame(first)
      if (added.length > 1) {
        navigation.openLibrary()
        notify(`Added ${countLabel(added.length, 'game')}`)
      }
    })
  }

  async function browse() {
    const path = await api.pickFolder('Choose a game folder')
    if (path !== null) await add([path])
  }

  async function scan() {
    const path = await api.pickFolder('Choose a folder to search for games')
    if (path === null) return

    isScanning.value = true
    await attempt(async () => {
      found.value = await api.findGames(path)
    })
    isScanning.value = false
  }

  async function addFound(paths: string[]) {
    found.value = null
    if (paths.length > 0) await add(paths)
  }

  async function play(game: GameInfo) {
    const hasStarted = await change(game.id, () =>
      api.playGame(game.id, preferences.backupBeforePlay),
    )
    if (hasStarted && preferences.minimizeOnPlay) await getCurrentWindow().minimize()
  }

  async function onGameEnded({ id, playedMs, isEarly }: GameEnded) {
    await attempt(refresh)
    const title = gameById(id)?.title ?? 'The game'
    if (isEarly) {
      notify(`${title} closed right away. Check its program under Details.`, 'error')
    } else {
      notify(`Played ${title} for ${formatDuration(playedMs)}`)
    }
    if (preferences.restoreAfterPlay) await showWindow()
  }

  const stop = (game: GameInfo) =>
    change(game.id, () => api.stopGame(game.id), `Stopping ${game.title}`)

  const setPlayStatus = (game: GameInfo, status: PlayStatus) =>
    change(game.id, () => api.setPlayStatus(game.id, status))

  const setNotes = (game: GameInfo, notes: string) =>
    change(game.id, () => api.setNotes(game.id, notes))

  const setArguments = (game: GameInfo, text: string) =>
    change(game.id, () => api.setArguments(game.id, text))

  watch(
    () => preferences.staysInTray,
    (stays) => attempt(() => api.setStaysInTray(stays)),
    { immediate: true },
  )

  watch(
    () => preferences.developerMode,
    (enabled) => attempt(() => api.setDeveloperMode(enabled)),
    { immediate: true },
  )

  const install = (game: GameInfo) =>
    change(
      game.id,
      () => api.installCheats(game.id),
      `Cheats installed. Press Ctrl+C in ${game.title}.`,
    )

  const uninstall = (game: GameInfo, removeSettings: boolean) =>
    change(game.id, () => api.uninstallCheats(game.id, removeSettings), 'Cheats removed')

  const toggleFavorite = (game: GameInfo) =>
    change(game.id, () => api.setFavorite(game.id, !game.favorite))

  const rename = (game: GameInfo, title: string) =>
    change(game.id, () => api.renameGame(game.id, title))

  async function remove(game: GameInfo) {
    const isRemoved = await change(
      game.id,
      () => api.removeGame(game.id),
      `${game.title} left the library. Its files are untouched.`,
    )
    if (isRemoved) navigation.openLibrary()
  }

  async function locate(game: GameInfo) {
    const path = await api.pickFolder(`Where is ${game.title} now?`)
    if (path !== null) await change(game.id, () => api.locateGame(game.id, path))
  }

  async function chooseExecutable(game: GameInfo) {
    const path = await api.pickFile('Choose the game program', 'Programs', ['exe', '*'])
    if (path !== null) await change(game.id, () => api.setExecutable(game.id, path))
  }

  async function chooseCover(game: GameInfo) {
    const extensions = ['png', 'jpg', 'jpeg', 'webp']
    const path = await api.pickFile('Choose a cover', 'Images', extensions)
    if (path !== null) await change(game.id, () => api.setCover(game.id, path))
  }

  const resetCover = (game: GameInfo) => change(game.id, () => api.setCover(game.id, null))

  const openFolder = (game: GameInfo, folder: api.Folder) =>
    attempt(() => api.openFolder(game.id, folder))

  async function updateAll() {
    const targets = outdated.value
    let updated = 0
    progress.value = 0
    for (const [index, game] of targets.entries()) {
      const succeeded = await attempt(() => api.installCheats(game.id))
      if (succeeded) updated += 1
      progress.value = Math.round(((index + 1) / targets.length) * 100)
    }
    await attempt(refresh)
    progress.value = null
    notify(`Updated ${countLabel(updated, 'game')}`)
  }

  return {
    games,
    sessions,
    fetchedAt,
    version,
    isLoaded,
    busyIds,
    progress,
    found,
    isScanning,
    outdated,
    running,
    favorites,
    toasts,
    notify,
    dismissToast,
    gameById,
    attempt,
    refresh,
    start,
    add,
    browse,
    scan,
    addFound,
    play,
    stop,
    onGameEnded,
    setPlayStatus,
    setNotes,
    setArguments,
    install,
    uninstall,
    toggleFavorite,
    rename,
    remove,
    locate,
    chooseExecutable,
    chooseCover,
    resetCover,
    openFolder,
    updateAll,
  }
})
