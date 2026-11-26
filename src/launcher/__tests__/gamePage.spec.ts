import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createBackup,
  listBackups,
  type GameInfo,
  type gameCover,
  type installCheats,
  type listGames,
  type listSessions,
  type liveGame,
  type openFolder,
  type setDeveloperMode,
  type setNotes,
  type setPlayStatus,
  type setStaysInTray,
} from '../api'
import { cheatNeedsAttention, defaultGameTab, isEditableTarget, isLiveReady } from '../gamePage'
import { useNavigation } from '../navigation'
import GamePage from '../pages/GamePage.vue'

vi.mock('../api', () => ({
  createBackup: vi.fn<typeof createBackup>(),
  gameCover: vi.fn<typeof gameCover>(() => Promise.resolve(null)),
  installCheats: vi.fn<typeof installCheats>(() => Promise.resolve(null)),
  listBackups: vi.fn<typeof listBackups>(() => Promise.resolve([])),
  listGames: vi.fn<typeof listGames>(() => Promise.resolve([])),
  listSessions: vi.fn<typeof listSessions>(() => Promise.resolve([])),
  liveGame: vi.fn<typeof liveGame>(() => Promise.resolve(null)),
  openFolder: vi.fn<typeof openFolder>(() => Promise.resolve(null)),
  setDeveloperMode: vi.fn<typeof setDeveloperMode>(() => Promise.resolve(null)),
  setNotes: vi.fn<typeof setNotes>(() => Promise.resolve(null)),
  setPlayStatus: vi.fn<typeof setPlayStatus>(() => Promise.resolve(null)),
  setStaysInTray: vi.fn<typeof setStaysInTray>(() => Promise.resolve(null)),
}))

function makeGame(changes: Partial<GameInfo> = {}): GameInfo {
  return {
    id: 'game-1',
    path: 'C:/Games/Quest',
    title: 'Sky Quest',
    defaultTitle: 'Sky Quest',
    engine: 'MZ',
    makerVersion: '1.8.0',
    isSupported: true,
    status: 'current',
    cheatVersion: '2.0.0',
    executable: 'C:/Games/Quest/Game.exe',
    session: null,
    arguments: '',
    playStatus: 'unsorted',
    notes: 'Check the clocktower',
    favorite: false,
    playMs: 3_600_000,
    lastPlayed: 1_700_000_000_000,
    addedAt: 1_690_000_000_000,
    coverKey: 'cover-1',
    ...changes,
  }
}

const activeSession = {
  game: 'game-1',
  startedAt: 1_700_000_000_000,
  endedAt: 1_700_000_060_000,
  playedMs: 60_000,
  origin: 'launcher' as const,
}

describe('gamePage helpers', () => {
  it('picks Live when running with current cheats, otherwise Overview or the requested tab', () => {
    const idle = makeGame()
    const running = makeGame({ session: activeSession })
    const outdatedRunning = makeGame({ status: 'outdated', session: activeSession })

    expect(defaultGameTab(idle)).toBe('overview')
    expect(defaultGameTab(running)).toBe('live')
    expect(defaultGameTab(outdatedRunning)).toBe('overview')
    expect(defaultGameTab(idle, 'saves')).toBe('saves')
    expect(isLiveReady(running)).toBe(true)
    expect(isLiveReady(outdatedRunning)).toBe(false)
  })

  it('flags cheats needing attention when outdated or unsupported', () => {
    expect(cheatNeedsAttention(makeGame())).toBe(false)
    expect(cheatNeedsAttention(makeGame({ status: 'outdated' }))).toBe(true)
    expect(cheatNeedsAttention(makeGame({ isSupported: false }))).toBe(true)
  })

  it('recognizes editable targets so Escape does not close the page while typing', () => {
    const input = document.createElement('input')
    const textarea = document.createElement('textarea')
    const select = document.createElement('select')
    const button = document.createElement('button')

    expect(isEditableTarget(input)).toBe(true)
    expect(isEditableTarget(textarea)).toBe(true)
    expect(isEditableTarget(select)).toBe(true)
    expect(isEditableTarget(button)).toBe(false)
    expect(isEditableTarget(null)).toBe(false)
  })
})

describe('GamePage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(listBackups).mockResolvedValue([
      {
        id: 'backup-1',
        kind: 'manual',
        createdAt: 1_700_000_000_000,
        files: 3,
        bytes: 4096,
      },
    ])
    vi.mocked(createBackup).mockResolvedValue({
      id: 'backup-2',
      kind: 'manual',
      createdAt: 1_700_000_100_000,
      files: 3,
      bytes: 4096,
    })
  })

  it('defaults to Overview with quick actions, notes, quick keys, and latest backup summary', async () => {
    const navigation = useNavigation()
    navigation.openGame('game-1')

    const wrapper = mount(GamePage, { props: { game: makeGame() } })
    await flushPromises()

    try {
      const activeTab = wrapper.get('[role="tab"][aria-selected="true"]')
      expect(activeTab.text()).toContain('Overview')
      expect(wrapper.get('textarea[aria-label="Notes"]').element).toHaveProperty(
        'value',
        'Check the clocktower',
      )
      expect(wrapper.text()).toContain('Ctrl+C')
      expect(wrapper.text()).toContain('3 files')
      expect(wrapper.text()).toContain('Back up saves')
      expect(wrapper.text()).toContain('Folders')

      await wrapper.get('textarea[aria-label="Notes"]').setValue('Updated route note')
      expect(wrapper.text()).toContain('Unsaved changes')
      expect(wrapper.findAll('button').some((button) => button.text() === 'Save')).toBe(true)
    } finally {
      wrapper.unmount()
    }
  })

  it('defaults to Live when the game is running with current cheats', async () => {
    const navigation = useNavigation()
    navigation.openGame('game-1')

    const wrapper = mount(GamePage, { props: { game: makeGame({ session: activeSession }) } })
    await flushPromises()

    try {
      const activeTab = wrapper.get('[role="tab"][aria-selected="true"]')
      expect(activeTab.text()).toContain('Live')
    } finally {
      wrapper.unmount()
    }
  })

  it('keeps the user on GamePage when pressing Escape inside Notes', async () => {
    const navigation = useNavigation()
    navigation.openGame('game-1')

    const wrapper = mount(GamePage, { props: { game: makeGame() }, attachTo: document.body })
    await flushPromises()

    try {
      const textarea = wrapper.get('textarea[aria-label="Notes"]').element
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      expect(navigation.page.name).toBe('game')

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      expect(navigation.page.name).toBe('library')
    } finally {
      wrapper.unmount()
    }
  })

  it('hides the quick-action bar when the game folder is missing', async () => {
    const navigation = useNavigation()
    navigation.openGame('game-1')

    const wrapper = mount(GamePage, { props: { game: makeGame({ status: 'missing' }) } })
    await flushPromises()

    try {
      expect(wrapper.text()).not.toContain('Back up saves')
      expect(wrapper.text()).toContain('Find its new folder')
    } finally {
      wrapper.unmount()
    }
  })
})
