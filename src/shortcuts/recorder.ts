type RecordCallback = (combo: string | null) => void

let pending: RecordCallback | undefined

export function recordCombo(callback: RecordCallback): void {
  cancelRecording()
  pending = callback
}

export function isRecording(): boolean {
  return pending !== undefined
}

export function finishRecording(combo: string | null): void {
  const callback = pending
  pending = undefined
  callback?.(combo)
}

export function cancelRecording(): void {
  finishRecording(null)
}
