import * as crypto from 'node:crypto'
import { once } from 'node:events'
import * as fs from 'node:fs'
import * as net from 'node:net'
import * as os from 'node:os'
import * as path from 'node:path'

import { createPinia, setActivePinia } from 'pinia'
import { expect, it, vi } from 'vitest'

import { gold, setGold } from '@/cheats/gold'
import { setupMockGame } from '@/dev/mockGame'
import type { LiveReply } from '@/engine/liveProtocol'
import { rpg } from '@/engine/runtime'
import { useCheats } from '@/stores/cheats'

import { startLiveControl } from '../liveControl'

function exchange(port: number, request: object): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1', () => {
      socket.write(`${JSON.stringify(request)}\n`)
    })
    let response = ''
    socket.setEncoding('utf8')
    socket.on('data', (chunk: string) => (response += chunk))
    socket.on('error', reject)
    socket.on('end', () => resolve(response))
  })
}

async function withGameServer(
  run: (context: {
    game: ReturnType<typeof setupMockGame>
    folder: string
    send: (fields?: object) => Promise<LiveReply>
    sendRaw: (fields: object) => Promise<string>
  }) => Promise<void>,
) {
  const game = setupMockGame()
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'rmc-live-'))
  const modules = { crypto, fs, net, path }
  vi.stubGlobal('require', (name: keyof typeof modules) => modules[name])
  Object.defineProperty(process, 'mainModule', {
    configurable: true,
    value: { filename: path.join(folder, 'index.html') },
  })
  setActivePinia(createPinia())
  let server: net.Server | undefined
  try {
    server = startLiveControl()
    if (!server) throw new Error('Live control did not start')
    await once(server, 'listening')
    const { port, token } = JSON.parse(
      fs.readFileSync(path.join(folder, 'cheat-settings', 'rmc-live-v1.json'), 'utf8'),
    ) as { port: number; token: string }
    const send = async (fields: object = {}) =>
      JSON.parse(await exchange(port, { token, ...fields })) as LiveReply
    await run({ game, folder, send, sendRaw: (fields) => exchange(port, fields) })
  } finally {
    if (server) await new Promise<void>((resolve) => server?.close(() => resolve()))
    vi.unstubAllGlobals()
    Reflect.deleteProperty(process, 'mainModule')
    fs.rmSync(folder, { recursive: true })
  }
}

it('serves current state and authenticates changes to the active game session', async () => {
  await withGameServer(async ({ game, send, sendRaw }) => {
    game.showScene('title')
    expect(await send()).toEqual({ status: 'waiting' })
    game.showScene('map')
    setGold(12)
    const initial = await send()
    if (initial.status !== 'live') throw new Error('Expected a live snapshot')
    expect(initial.state.gold).toBe(12)
    const {
      session,
      party: [actor],
    } = initial.state
    if (!actor) throw new Error('Expected an actor in the mock party')

    const action = { kind: 'gold', value: 500 }
    expect(await sendRaw({ token: 'invalid', session, action })).toBe('')
    expect(await send({ session: 'old', action })).toMatchObject({ status: 'error' })
    expect(await send({ session, action: { kind: 'gold', value: -1 } })).toMatchObject({
      status: 'error',
    })
    expect(gold()).toBe(12)
    expect(await send({ session, action })).toMatchObject({ status: 'live', state: { gold: 500 } })
    expect(gold()).toBe(500)
    expect(
      await send({ session, action: { kind: 'hp', actorId: actor.id, value: 5 } }),
    ).toMatchObject({
      status: 'live',
      state: { party: [{ ...actor, hp: 5 }, ...initial.state.party.slice(1)] },
    })

    expect(await send({ session, action: { kind: 'battleSpeed', value: 2.5 } })).toMatchObject({
      status: 'live',
      state: { battleSpeed: 2.5 },
    })
    expect(useCheats().battleSpeed).toBe(2.5)
  })
})

it('bounds the map preview and validates walking and cross-map destinations', async () => {
  await withGameServer(async ({ folder, send }) => {
    const query = { view: 'map', search: 'copper', page: 999 }
    const initial = await send({ query })
    if (initial.status !== 'live' || initial.detail?.kind !== 'map') {
      throw new Error('Expected a map snapshot')
    }
    expect(initial.detail.catalog).toEqual({
      page: 0,
      pages: 1,
      rows: [{ id: 2, name: 'Harbor of Ash / Copper Arcade' }],
    })
    const preview = initial.detail.preview
    if (!preview) throw new Error('Expected a preview of the current map')
    expect(preview.terrain.tiles).toHaveLength(preview.terrain.columns * preview.terrain.rows)
    const map = rpg.$gameMap
    if (!map) throw new Error('Expected a loaded map')
    vi.spyOn(map, 'width').mockReturnValue(80)
    vi.spyOn(map, 'height').mockReturnValue(50)
    const panned = await send({ query: { ...query, camera: { mapId: 1, left: 42, top: 999 } } })
    expect(panned).toMatchObject({
      status: 'live',
      detail: {
        preview: { left: 42, top: 35, terrain: { left: 34, top: 27, columns: 39, rows: 23 } },
      },
    })
    expect(
      await send({ query: { ...query, camera: { mapId: 9, left: 42, top: 35 } } }),
    ).toMatchObject({
      status: 'live',
      detail: { preview: { left: preview.left, top: preview.top } },
    })
    const session = initial.state.session
    expect(
      await send({
        session,
        query,
        action: { kind: 'walk', fromMapId: 1, mapId: 1, x: 2, y: 3 },
      }),
    ).toMatchObject({ status: 'live', detail: { preview: { x: 2, y: 3 } } })
    expect(
      await send({
        session,
        query,
        action: { kind: 'walk', fromMapId: 2, mapId: 1, x: 2, y: 3 },
      }),
    ).toMatchObject({ status: 'error' })

    fs.mkdirSync(path.join(folder, 'data'))
    fs.writeFileSync(path.join(folder, 'data', 'Map002.json'), '{"width":10,"height":10}')
    const player = rpg.$gamePlayer
    if (!player) throw new Error('Expected a player in the mock game')
    const transfer = vi.spyOn(player, 'reserveTransfer')
    const action = { kind: 'teleport', fromMapId: 1, mapId: 2, x: 10, y: 2 }
    expect(await send({ session, query, action })).toMatchObject({ status: 'error' })
    expect(transfer).not.toHaveBeenCalled()
    expect(await send({ session, query, action: { ...action, x: 4 } })).toMatchObject({
      status: 'live',
    })
    expect(transfer).toHaveBeenCalledWith(2, 4, 2, 0, 0)
  })
})

it('pages live catalogs and safely edits inventory, switches, and primitive variables', async () => {
  await withGameServer(async ({ send }) => {
    const initial = await send()
    if (initial.status !== 'live') throw new Error('Expected a live snapshot')
    const session = initial.state.session
    const query = { view: 'items', search: 'ether', page: 0 }
    const setQuantity = (id: number, value: number) =>
      send({
        session,
        query,
        action: { kind: 'quantity', group: 'items', id, value },
      })
    expect(await setQuantity(4, 7)).toMatchObject({
      status: 'live',
      detail: { group: 'items', catalog: { rows: [{ id: 4, name: 'Ether', quantity: 7 }] } },
    })
    expect(await setQuantity(2, 7)).toMatchObject({ status: 'error' })
    const switches = await send({ query: { view: 'switches', page: 1 } })
    expect(switches).toMatchObject({ detail: { catalog: { page: 1, pages: 6 } } })
    if (switches.status !== 'live' || switches.detail?.kind !== 'switches') {
      throw new Error('Expected switch rows')
    }
    expect(switches.detail.catalog.rows).toHaveLength(24)
    expect(switches.detail.catalog.rows[0]?.id).toBe(25)
    expect(
      await send({
        session,
        query: { view: 'switches', search: 'switch 25' },
        action: { kind: 'switch', id: 25, value: true },
      }),
    ).toMatchObject({ detail: { catalog: { rows: [{ id: 25, value: true }] } } })

    const cyclic: { self?: object } = {}
    cyclic.self = cyclic
    rpg.$gameVariables?.setValue(2, cyclic)
    const variables = await send({
      session,
      query: { view: 'variables' },
      action: { kind: 'variable', id: 1, value: 'Quest complete' },
    })
    if (variables.status !== 'live' || variables.detail?.kind !== 'variables') {
      throw new Error('Expected variable rows')
    }
    expect(variables.detail.catalog.rows.slice(0, 2)).toEqual([
      { id: 1, name: 'Variable 1', value: 'Quest complete' },
      { id: 2, name: 'Variable 2', value: null },
    ])
    expect(
      await send({
        session,
        action: { kind: 'variable', id: 2, value: 1 },
      }),
    ).toMatchObject({ status: 'error' })
  })
})

it('controls enemies and results only in the battle that supplied the live state', async () => {
  await withGameServer(async ({ game, send }) => {
    game.startBattle()
    const query = { view: 'battle' }
    const initial = await send({ query })
    if (initial.status !== 'live' || initial.detail?.kind !== 'battle') {
      throw new Error('Expected a battle snapshot')
    }
    const { battleId } = initial.detail
    const session = initial.state.session
    const updated = await send({
      session,
      query,
      action: { kind: 'enemyHp', battleId, index: 0, value: 20 },
    })
    if (updated.status !== 'live' || updated.detail?.kind !== 'battle') {
      throw new Error('Expected updated enemy HP')
    }
    expect(updated.detail.enemies[0]).toMatchObject({ index: 0, hp: 20 })
    expect(
      await send({
        session,
        query,
        action: { kind: 'battleResult', battleId, result: 'abort' },
      }),
    ).toMatchObject({ state: { inBattle: false }, detail: { battleId: null } })
    game.startBattle()
    expect(
      await send({
        session,
        query,
        action: { kind: 'battleResult', battleId, result: 'defeat' },
      }),
    ).toMatchObject({ status: 'error' })
  })
})
