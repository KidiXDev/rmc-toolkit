import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { logDetail, logError, logEvent } from '../log'
import { createStorage } from '../storage'

const MEGABYTE = 1024 * 1024

let folder = ''

const logFile = () => path.join(folder, 'cheat-settings', 'rmc-log.log')
const readLog = () => fs.readFileSync(logFile(), 'utf8')

function runAs(developerMode: string | undefined) {
  vi.stubGlobal('require', (name: string) => (name === 'fs' ? fs : path))
  vi.stubEnv('RMC_DEVELOPER_MODE', developerMode)
  Object.defineProperty(process, 'mainModule', {
    configurable: true,
    value: { filename: path.join(folder, 'index.html') },
  })
}

describe('log', () => {
  beforeEach(() => {
    folder = fs.mkdtempSync(path.join(os.tmpdir(), 'rmc-log-'))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    Reflect.deleteProperty(process, 'mainModule')
    fs.rmSync(folder, { recursive: true })
  })

  it('keeps details out of the standard log', () => {
    for (const mode of [undefined, '0']) {
      runAs(mode)
      logDetail('every element on the page')
    }
    logEvent('game ready')
    logError('plugin broke')

    expect(readLog()).toMatch(/info game ready\n.*error plugin broke\n$/)
    expect(readLog()).not.toContain('detail')
  })

  it('writes details in developer mode', () => {
    runAs('1')
    logDetail('every element on the page')

    expect(readLog()).toContain('detail every element on the page')
  })

  it('never grows past one megabyte and keeps the newest lines whole', () => {
    runAs('1')
    const storage = createStorage()
    const line = `${'あ'.repeat(5000)}\n`
    for (let written = 0; written < 2 * MEGABYTE; written += 15_000) {
      storage.append('rmc-log', line)
      expect(fs.statSync(logFile()).size).toBeLessThanOrEqual(MEGABYTE)
    }
    storage.append('rmc-log', 'newest\n')

    const lines = readLog().split('\n')
    expect(lines.slice(-2)).toEqual(['newest', ''])
    expect(new Set(lines.slice(0, -2))).toEqual(new Set([line.trim()]))
  })
})
