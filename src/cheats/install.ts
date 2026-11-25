import { installBattle } from './battle'
import { installMovement } from './movement'
import { installParty } from './party'
import { installSpeed } from './speed'

export function installCheats(): void {
  installSpeed()
  installMovement()
  installParty()
  installBattle()
}
