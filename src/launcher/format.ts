import type { BackupKind, GameInfo } from './api'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const KILOBYTE = 1024
const MEGABYTE = KILOBYTE * 1024

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function formatDate(milliseconds: number): string {
  return dateFormat.format(milliseconds)
}

export function formatDuration(milliseconds: number): string {
  if (milliseconds === 0) return '0 min'
  if (milliseconds < MINUTE) return 'Under 1 min'
  const hours = Math.floor(milliseconds / HOUR)
  const minutes = Math.floor((milliseconds % HOUR) / MINUTE)
  if (hours === 0) return `${minutes} min`
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
}

export function formatPlaytime(milliseconds: number): string {
  return milliseconds === 0 ? 'Not played yet' : formatDuration(milliseconds)
}

const pad = (value: number) => String(value).padStart(2, '0')

export function formatClock(milliseconds: number): string {
  const hours = Math.floor(milliseconds / HOUR)
  const minutes = Math.floor((milliseconds % HOUR) / MINUTE)
  const seconds = Math.floor((milliseconds % MINUTE) / SECOND)
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}

export function playSummary({ session, playMs, lastPlayed }: GameInfo): string {
  if (session !== null) return 'Playing now'
  const playtime = formatPlaytime(playMs)
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
