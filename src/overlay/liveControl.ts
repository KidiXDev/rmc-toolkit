import type { Server } from 'node:net'

import { gold, maxGold, setGold } from '@/cheats/gold'
import {
  partyMembers,
  partySnapshots,
  recoverParty,
  setHp,
  setMp,
  setPartyGodMode,
} from '@/cheats/party'
import { SPEED_RANGE } from '@/cheats/speed'
import { refreshLive } from '@/engine/live'
import type { LiveGameState, LiveReply } from '@/engine/liveProtocol'
import { logError } from '@/engine/log'
import { currentMapLabel, isCurrentScene, isGameReady, isInBattle, rpg } from '@/engine/runtime'
import { createDesktopStorage } from '@/engine/storage'
import { useCheats } from '@/stores/cheats'

import { applyLiveDetailAction, liveDetail } from './liveViews'

const MAX_REQUEST_LENGTH = 2048
const SOCKET_TIMEOUT_MS = 1000
const ENDPOINT_NAME = 'rmc-live-v1'

function snapshot(session: string): LiveGameState {
  const { gameSpeed, battleSpeed, noClip, noEncounters, godParty } = useCheats()
  return {
    session,
    map: currentMapLabel(),
    inBattle: isInBattle(),
    gold: gold(),
    maxGold: maxGold(),
    party: partySnapshots().map(({ id, name, level, hp, maxHp, mp, maxMp }) => ({
      id,
      name,
      level,
      hp,
      maxHp,
      mp,
      maxMp,
    })),
    gameSpeed,
    battleSpeed,
    noClip,
    noEncounters,
    godParty,
  }
}

function applyAction(action: unknown): boolean | string {
  if (!action || typeof action !== 'object' || !('kind' in action)) return false
  const { kind } = action
  const value = 'value' in action ? action.value : undefined
  const cheats = useCheats()

  switch (kind) {
    case 'gold':
      if (
        typeof value !== 'number' ||
        !Number.isSafeInteger(value) ||
        value < 0 ||
        value > maxGold()
      )
        return false
      setGold(value)
      return true
    case 'gameSpeed':
    case 'battleSpeed':
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < SPEED_RANGE.min ||
        value > SPEED_RANGE.max
      )
        return false
      cheats[kind] = value
      return true
    case 'noClip':
    case 'noEncounters':
      if (typeof value !== 'boolean') return false
      cheats[kind] = value
      return true
    case 'godParty':
      if (typeof value !== 'boolean') return false
      setPartyGodMode(value)
      return true
    case 'hp':
    case 'mp': {
      if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return false
      const actorId = 'actorId' in action ? action.actorId : undefined
      const actor = partyMembers().find((member) => member.actorId() === actorId)
      if (!actor || value > (kind === 'hp' ? actor.mhp : actor.mmp)) return false
      const change = kind === 'hp' ? setHp : setMp
      change(actor.actorId(), value)
      return true
    }
    case 'recoverParty':
      recoverParty()
      return true
    default:
      return applyLiveDetailAction(action)
  }
}

function replyTo(request: unknown, token: string, session: string): LiveReply | null {
  if (!request || typeof request !== 'object' || !('token' in request) || request.token !== token)
    return null
  if (!isGameReady() || isCurrentScene(rpg.Scene_Title)) return { status: 'waiting' }

  if ('action' in request && request.action !== null) {
    if (!('session' in request) || request.session !== session) {
      return { status: 'error', message: 'The game session changed. Try again.' }
    }
    const result = applyAction(request.action)
    if (result !== true) {
      return {
        status: 'error',
        message: result || 'This control is unavailable or the value is invalid.',
      }
    }
    refreshLive()
  }

  return {
    status: 'live',
    state: snapshot(session),
    detail: liveDetail('query' in request ? request.query : undefined),
  }
}

export function startLiveControl(): Server | undefined {
  const storage = createDesktopStorage()
  if (!storage || !rpg.require) return

  const { randomBytes } = rpg.require('crypto')
  const token = randomBytes(32).toString('hex')
  const session = randomBytes(16).toString('hex')
  const { createServer } = rpg.require('net')

  const server = createServer((socket) => {
    let line = ''
    socket.setTimeout(SOCKET_TIMEOUT_MS, () => socket.destroy())
    socket.on('error', () => socket.destroy())
    socket.setEncoding('utf8')
    socket.on('data', (chunk: string) => {
      if (line.length + chunk.length > MAX_REQUEST_LENGTH) {
        socket.destroy()
        return
      }
      line += chunk
      const end = line.indexOf('\n')
      if (end === -1) return
      socket.pause()

      let request: unknown
      try {
        request = JSON.parse(line.slice(0, end))
      } catch {
        socket.destroy()
        return
      }

      try {
        const reply = replyTo(request, token, session)
        if (reply) socket.end(`${JSON.stringify(reply)}\n`)
        else socket.destroy()
      } catch (error) {
        socket.end('{"status":"error","message":"The game could not complete the request."}\n')
        logError(error)
      }
    })
  })

  server.on('error', logError)
  server.listen(0, '127.0.0.1', () => {
    const address = server.address()
    if (!address || typeof address === 'string') return
    try {
      storage.write(ENDPOINT_NAME, { port: address.port, token })
    } catch (error) {
      server.close()
      logError(error)
    }
  })
  server.unref()
  window.addEventListener('pagehide', () => server.close(), { once: true })
  return server
}
