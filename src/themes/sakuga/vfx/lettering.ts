import { clamp, easeIn, Spring, TAU } from './math'
import { PALETTE } from './palette'
import { emit } from './stage'
import words from './words.json'

type Word = keyof typeof words
type Style = 'solid' | 'hollow' | 'dotted'

const PADDING = 24
const TILE = { width: 22, height: 44, dot: 5.2 }

const FILLS: Record<Style, string> = {
  solid: PALETTE.ink,
  hollow: PALETTE.fill,
  dotted: PALETTE.fill,
}

const baked = new Map<string, HTMLCanvasElement>()

function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return { canvas, g: canvas.getContext('2d') }
}

function screentone(edge: string): CanvasImageSource {
  const { canvas, g } = createCanvas(TILE.width, TILE.height)
  if (!g) return canvas
  g.fillStyle = PALETTE.fill
  g.fillRect(0, 0, TILE.width, TILE.height)
  g.fillStyle = edge
  g.beginPath()
  const { width, height, dot } = TILE
  const centers = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
    [width / 2, height / 2],
  ] as const
  for (const [x, y] of centers) {
    g.moveTo(x + dot, y)
    g.arc(x, y, dot, 0, TAU)
  }
  g.fill()
  return canvas
}

function bake(name: Word, style: Style): HTMLCanvasElement {
  const key = `${name}-${style}`
  const cached = baked.get(key)
  if (cached) return cached

  const { width, height, path } = words[name]
  const { canvas, g } = createCanvas(width + PADDING * 2, height + PADDING * 2)
  baked.set(key, canvas)
  if (!g) return canvas

  const edge = style === 'solid' ? PALETTE.fill : PALETTE.ink
  const outline = new Path2D(path)
  g.translate(PADDING, PADDING)
  g.lineJoin = 'round'
  g.strokeStyle = edge
  g.fillStyle = edge
  g.lineWidth = width * 0.07
  g.stroke(outline)
  g.fill(outline)
  g.fillStyle = FILLS[style]
  if (style === 'dotted') g.fillStyle = g.createPattern(screentone(edge), 'repeat') ?? FILLS.dotted
  g.fill(outline)
  return canvas
}

interface LetteringOptions {
  size: number
  rotation?: number
  life?: number
  style?: Style
}

export function lettering(name: Word, x: number, y: number, options: LetteringOptions): void {
  const { size, rotation = -0.14, life = 0.95, style = 'solid' } = options
  const image = bake(name, style)
  const baseScale = size / words[name].width
  const entrance = new Spring(0.2, 520, 17)
  entrance.target = 1
  let lastTime = 0

  emit(life, (g, progress, time) => {
    const leave = 1 - easeIn(clamp((progress - 0.86) / 0.14))
    const scale = entrance.step(Math.max(0.001, time - lastTime)) * leave * baseScale
    lastTime = time

    const width = image.width * scale
    const height = image.height * scale
    g.translate(x + Math.sin(time * 31) * 0.8, y + Math.cos(time * 27) * 0.8)
    g.rotate(rotation + Math.sin(time * 6) * 0.03)
    g.drawImage(image, -width / 2, -height / 2, width, height)
  })
}
