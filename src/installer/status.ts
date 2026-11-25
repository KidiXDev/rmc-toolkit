import type { GameInfo } from './api'

export function statusLabel({ status, version }: GameInfo): string {
  switch (status) {
    case 'current':
      return `installed (${version})`
    case 'outdated':
      return version ? `needs an update (${version})` : 'needs a repair'
    case 'missing':
      return 'folder not found'
    case 'notInstalled':
      return 'not installed'
  }
}
