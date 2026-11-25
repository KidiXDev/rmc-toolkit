import { flushPromises, mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'

import type { LiveGameState, LiveReply } from '@/engine/liveProtocol'

import { liveGame } from '../api'
import LiveControls from '../pages/LiveControls.vue'

vi.mock('../api', () => ({ liveGame: vi.fn<typeof liveGame>() }))

const state: LiveGameState = {
  session: 'game-session',
  map: 'Harbor',
  inBattle: false,
  gold: 10,
  maxGold: 999,
  party: [],
  gameSpeed: 1,
  battleSpeed: 1,
  noClip: false,
  noEncounters: false,
  godParty: false,
}

it('loads the selected view after an earlier poll and sends the current inventory action', async () => {
  vi.useFakeTimers()
  let resolvePlayer!: (reply: LiveReply) => void
  const player = new Promise<LiveReply>((resolve) => {
    resolvePlayer = resolve
  })
  const request = vi.mocked(liveGame)
  request.mockImplementation((_id, query, _session, action) => {
    if (query.view === 'player') return player
    return Promise.resolve({
      status: 'live',
      state,
      detail: {
        kind: 'inventory',
        group: 'items',
        catalog: {
          page: 0,
          pages: 1,
          rows: [{ id: 4, name: 'Ether', description: '', quantity: action ? 99 : 0, max: 99 }],
        },
      },
    })
  })

  const wrapper = mount(LiveControls, { props: { id: 'fixture' } })
  async function click(label: string) {
    const button = wrapper.findAll('button').find((element) => element.text() === label)
    if (!button) throw new Error(`Missing control: ${label}`)
    await button.trigger('click')
  }

  try {
    await click('Inventory')
    resolvePlayer({ status: 'live', state })
    await flushPromises()
    await vi.advanceTimersByTimeAsync(400)
    expect(wrapper.get('input[aria-label="Ether quantity"]').element).toHaveProperty('value', '0')

    await click('Max')
    await flushPromises()
    expect(request).toHaveBeenLastCalledWith(
      'fixture',
      { view: 'items', search: '', page: 0 },
      state.session,
      { kind: 'quantity', group: 'items', id: 4, value: 99 },
    )
    expect(wrapper.get('input[aria-label="Ether quantity"]').element).toHaveProperty('value', '99')
  } finally {
    wrapper.unmount()
    vi.useRealTimers()
    request.mockReset()
  }
})
