import type { BackupKind, GameInfo } from './api'

const MINUTE = 60
const HOUR = 60 * MINUTE
const KILOBYTE = 1024
const MEGABYTE = KILOBYTE * 1024

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function formatDate(milliseconds: number): string {
  return dateFormat.format(milliseconds)
}

export function formatPlaytime(seconds: number): string {
  if (seconds === 0) return 'Not played yet'
  if (seconds < MINUTE) return 'Less than a minute'
  if (seconds < HOUR) return `${Math.floor(seconds / MINUTE)} min`
  return `${(seconds / HOUR).toFixed(1)} h`
}

export function playSummary({ isRunning, playSeconds, lastPlayed }: GameInfo): string {
  if (isRunning) return 'Playing now'
  const playtime = formatPlaytime(playSeconds)
  return lastPlayed === null ? playtime : `${playtime}, last played ${formatDate(lastPlayed)}`
}

export function formatBytes(bytes: number): string {
  if (bytes < MEGABYTE) return `${Math.max(1, Math.round(bytes / KILOBYTE))} KB`
  return `${(bytes / MEGABYTE).toFixed(1)} MB`
}

export function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

export function engineLabel({ engine, makerVersion }: GameInfo): string {
  if (engine === null) return 'Unknown engine'
  return makerVersion === null ? `RPG Maker ${engine}` : `RPG Maker ${engine} ${makerVersion}`
}

export function cheatLabel({ status, cheatVersion }: GameInfo): string {
  switch (status) {
    case 'current':
      return `Cheats ${cheatVersion ?? ''} installed`
    case 'outdated':
      return cheatVersion ? `Cheats ${cheatVersion} need an update` : 'Cheats need a repair'
    case 'missing':
      return 'Game folder not found'
    case 'notInstalled':
      return 'No cheats installed'
  }
}

export function backupLabel(kind: BackupKind): string {
  switch (kind) {
    case 'manual':
      return 'Made by you'
    case 'beforePlay':
      return 'Before playing'
    case 'beforeRestore':
      return 'Before a restore'
  }
}
