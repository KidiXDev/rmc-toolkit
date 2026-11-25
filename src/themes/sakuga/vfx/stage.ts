import { logError } from '@/engine/log'

import { clamp } from './math'

const MAX_PIXEL_RATIO = 2
const MAX_FRAME_SECONDS = 0.034

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

interface Placement {
  x: number
  y: number
  scale: number
  cutout?: Box
}

export type Draw = (g: CanvasRenderingContext2D, progress: number, time: number) => void

interface Mark {
  age: number
  life: number
  draw: Draw
  placement: Placement
}

type Animation = (seconds: number) => boolean

const ORIGIN: Placement = { x: 0, y: 0, scale: 1 }

const prefersCalm = window.matchMedia('(prefers-reduced-motion: reduce)')

let canvas: HTMLCanvasElement | null = null
let marks: Mark[] = []
let timers: Array<{ at: number; run: () => void; placement: Placement }> = []
let placement = ORIGIN
let clock = 0
let lastFrame = 0
let isRunning = false

const animations = new Set<Animation>()

function resize(): void {
  if (!canvas) return
  const ratio = Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1)
  canvas.width = window.innerWidth * ratio
  canvas.height = window.innerHeight * ratio
}

function applyPlacement(g: CanvasRenderingContext2D, { x, y, scale, cutout }: Placement): void {
  if (cutout) {
    const hole = new Path2D()
    hole.rect(0, 0, window.innerWidth, window.innerHeight)
    hole.rect(cutout.x, cutout.y, cutout.width, cutout.height)
    g.clip(hole, 'evenodd')
  }
  g.translate(x, y)
  g.scale(scale, scale)
  g.translate(-x, -y)
}

function drawSafely(g: CanvasRenderingContext2D, mark: Mark): void {
  try {
    applyPlacement(g, mark.placement)
    mark.draw(g, mark.age / mark.life, mark.age)
  } catch (error) {
    mark.life = 0
    logError(error)
  }
}

function paint(seconds: number): void {
  const g = canvas?.getContext('2d')
  if (!canvas || !g) return

  const ratio = canvas.width / window.innerWidth
  g.setTransform(ratio, 0, 0, ratio, 0, 0)
  g.clearRect(0, 0, window.innerWidth, window.innerHeight)
  g.lineJoin = 'round'
  g.lineCap = 'round'

  for (const mark of marks) mark.age += seconds
  marks = marks.filter((mark) => mark.age < mark.life)

  for (const mark of marks) {
    g.save()
    drawSafely(g, mark)
    g.restore()
  }
}

function runTimers(): void {
  const due = timers.filter((timer) => timer.at <= clock)
  timers = timers.filter((timer) => timer.at > clock)
  for (const timer of due) withPlacement(timer.placement, timer.run)
}

function frame(now: number): void {
  const seconds = clamp((now - lastFrame) / 1000, 0, MAX_FRAME_SECONDS)
  lastFrame = now
  clock += seconds

  runTimers()
  for (const animation of animations) {
    if (!animation(seconds)) animations.delete(animation)
  }
  paint(seconds)

  isRunning = animations.size > 0 || timers.length > 0 || marks.length > 0
  if (isRunning) requestAnimationFrame(frame)
}

function wake(): void {
  if (isRunning) return
  isRunning = true
  lastFrame = performance.now()
  requestAnimationFrame(frame)
}

function withPlacement(next: Placement, run: () => void): void {
  const previous = placement
  placement = next
  run()
  placement = previous
}

export function isCalm(): boolean {
  return prefersCalm.matches
}

export function scaled(x: number, y: number, scale: number, run: () => void): void {
  withPlacement({ x, y, scale }, run)
}

export function behind(cutout: Box, run: () => void): void {
  withPlacement({ ...placement, cutout }, run)
}

export function emit(life: number, draw: Draw): void {
  if (isCalm() || !canvas) return
  marks.push({ age: 0, life, draw, placement })
  wake()
}

export function later(milliseconds: number, run: () => void): void {
  timers.push({ at: clock + milliseconds / 1000, run, placement })
  wake()
}

export function animate(animation: Animation): () => void {
  animations.add(animation)
  wake()
  return () => animations.delete(animation)
}

export function mountStage(layer: HTMLElement): () => void {
  const stage = document.createElement('canvas')
  stage.className = 'fx-stage'
  layer.append(stage)
  canvas = stage
  resize()
  window.addEventListener('resize', resize)

  return () => {
    window.removeEventListener('resize', resize)
    stage.remove()
    if (canvas !== stage) return
    canvas = null
    marks = []
    timers = []
    animations.clear()
  }
}
