import { clamp, easeIn, easeOut, lerp, overshoot, random, TAU, times } from './math'
import { PALETTE } from './palette'
import { cloud, polygon, shadedShape, type Point } from './shapes'
import { emit } from './stage'

const UP = -Math.PI / 2

const fadeAfter = (progress: number, start: number) =>
  1 - easeIn(clamp((progress - start) / (1 - start)))

const polar = (x: number, y: number, angle: number, radius: number): Point => [
  x + Math.cos(angle) * radius,
  y + Math.sin(angle) * radius,
]

interface PuffOptions {
  count?: number
  size?: number
  vx?: number
  vy?: number
  life?: number
}

export function puff(x: number, y: number, options: PuffOptions = {}): void {
  const { count = 5, size = 13, vx = 0, vy = -18, life = 0.8 } = options
  const lobes = [
    { angle: 0, distance: 0, radius: size, phase: 0, spin: 1 },
    ...times(count, (index) => ({
      angle: (index / count) * TAU + random(0, 0.6),
      distance: random(0.25, 0.9) * size,
      radius: random(0.55, 1) * size,
      phase: random(0, TAU),
      spin: random(0.6, 1.3),
    })),
  ]

  emit(life, (g, progress, time) => {
    const travel = easeOut(progress)
    const size01 = overshoot(clamp(time / 0.22)) * fadeAfter(progress, 0.55)
    const centerX = x + vx * travel * life
    const centerY = y + vy * travel * life

    const circles = lobes.map(({ angle, distance, radius, phase, spin }) => {
      const [lobeX, lobeY] = polar(
        centerX,
        centerY,
        angle + time * 0.9 * spin,
        distance * (0.5 + travel * 0.9),
      )
      const boil = 1 + Math.sin(time * 9 + phase) * 0.05
      return [lobeX, lobeY - travel * 5 * spin, Math.max(0, radius * size01 * boil)] as const
    })
    cloud(g, circles, size > 6.5)
  })
}

interface BurstOptions {
  radius?: number
  spikes?: number
  life?: number
}

export function burst(x: number, y: number, options: BurstOptions = {}): void {
  const { radius = 44, spikes = 13, life = 0.34 } = options
  const rotation = random(0, TAU)
  const jitter = times(spikes * 2, (index) => (index % 2 ? random(0.34, 0.5) : random(0.75, 1.15)))
  const needles = times(8, (index) => ({
    angle: (index / 8) * TAU + random(0, 0.5),
    length: random(1.25, 1.75),
    width: random(0.03, 0.055),
  }))

  const star = (size: number, turn: number, inner: number) =>
    polygon(
      jitter.map((amount, index) =>
        polar(
          x,
          y,
          rotation + turn + (index / jitter.length) * TAU,
          size * amount * (index % 2 ? inner : 1),
        ),
      ),
    )

  emit(life, (g, progress) => {
    const size = radius * easeOut(clamp(progress / 0.3))
    const hollow = 1 + easeIn(clamp((progress - 0.35) / 0.65)) * 1.3
    const start = size * 0.6 * Math.min(1.9, hollow)

    g.fillStyle = PALETTE.accent
    for (const { angle, length, width } of needles) {
      const end = size * length
      if (end <= start) continue
      g.fill(
        polygon([
          polar(x, y, angle - width, start),
          polar(x, y, angle, end),
          polar(x, y, angle + width, start),
        ]),
      )
    }

    const backStar = star(size * 1.16, 0.19, hollow)
    g.fillStyle = PALETTE.shade
    g.fill(backStar)
    g.strokeStyle = PALETTE.line
    g.lineWidth = 1.2
    g.stroke(backStar)
    shadedShape(g, star(size * 0.84, 0, hollow), 1.4)
  })
}

interface ShardOptions {
  count?: number
  speed?: number
  size?: number
  life?: number
  direction?: number
  arc?: number
  gravity?: number
}

const SHARD_OUTLINE: readonly Point[] = [
  [-1.4, 0.1],
  [-0.6, -0.7],
  [1.2, -0.45],
  [1.5, 0.15],
  [0.4, 0.75],
]

function shard(x: number, y: number, options: Required<ShardOptions>): void {
  const angle = options.direction + random(-options.arc, options.arc) / 2
  const speed = options.speed * random(0.5, 1.15)
  const size = options.size * random(0.6, 1.4)
  const spin = random(-7, 7)
  const facets = SHARD_OUTLINE.map(
    ([px, py]) => [px * random(0.8, 1.2), py * random(0.8, 1.2)] as const,
  )

  emit(options.life * random(0.7, 1), (g, progress, time) => {
    const scale = size * fadeAfter(progress, 0.6)
    g.translate(
      x + Math.cos(angle) * speed * time,
      y + Math.sin(angle) * speed * time + options.gravity * time * time,
    )
    g.rotate(spin * time + angle)
    const path = polygon(facets.map(([px, py]) => [px * scale, py * scale] as const))
    shadedShape(g, path, 1.1, scale * 0.45)
  })
}

export function shards(x: number, y: number, options: ShardOptions = {}): void {
  const { count = 7, ...rest } = options
  const defaults = {
    count,
    speed: 190,
    size: 5,
    life: 0.75,
    direction: UP,
    arc: Math.PI,
    gravity: 420,
  }
  for (let index = 0; index < count; index += 1) shard(x, y, { ...defaults, ...rest })
}

interface RingOptions {
  rx?: number
  ry?: number
  life?: number
  width?: number
}

export function ring(x: number, y: number, options: RingOptions = {}): void {
  const { rx = 40, ry = 12, life = 0.5, width = 5 } = options

  emit(life, (g, progress) => {
    const spread = 0.3 + easeOut(progress)
    const lineWidth = width * (1 - progress)
    g.beginPath()
    g.ellipse(x, y, rx * spread, ry * spread, 0, 0, TAU)
    g.strokeStyle = PALETTE.line
    g.lineWidth = lineWidth + 2.4
    g.stroke()
    g.strokeStyle = PALETTE.fill
    g.lineWidth = Math.max(0.3, lineWidth)
    g.stroke()
  })
}

interface SlashOptions {
  length?: number
  angle?: number
  life?: number
  thickness?: number
  color?: string
}

const SLASH_SWEEP = 1.24
const SLASH_SEGMENTS = 26

export function slash(x: number, y: number, options: SlashOptions = {}): void {
  const { length = 110, angle = -0.5, life = 0.42, thickness = 15 } = options
  const color = options.color ?? PALETTE.accent
  const radius = length * 0.9
  const facing = angle + UP
  const [centerX, centerY] = polar(x, y, facing, -radius * 0.86)
  const startAngle = facing - SLASH_SWEEP / 2

  emit(life, (g, progress) => {
    const head = easeOut(clamp(progress / 0.42))
    const tail = easeIn(clamp((progress - 0.22) / 0.78))
    if (head - tail < 0.01) return

    const edge = (width: number) =>
      times(SLASH_SEGMENTS + 1, (index) => {
        const along = index / SLASH_SEGMENTS
        const inset = width * Math.sin(along * Math.PI) ** 0.7
        const arc = startAngle + SLASH_SWEEP * lerp(tail, head, along)
        return polar(centerX, centerY, arc, radius - inset)
      })
    const crescent = (width: number) => polygon([...edge(0), ...edge(width).reverse()])

    const outer = crescent(thickness)
    g.fillStyle = color
    g.fill(outer)
    g.fillStyle = PALETTE.fill
    g.fill(crescent(thickness * 0.42))
    g.strokeStyle = PALETTE.line
    g.lineWidth = 1.3
    g.stroke(outer)
  })
}

interface LineOptions {
  count?: number
  direction?: number
  length?: number
  spread?: number
  life?: number
}

function speedLine(x: number, y: number, options: Required<LineOptions>): void {
  const offset = random(-options.spread, options.spread)
  const length = options.length * random(0.5, 1.3)
  const delay = random(0, 0.25)
  const width = random(1, 2.6)
  const originX = x - Math.sin(options.direction) * offset
  const originY = y + Math.cos(options.direction) * offset

  emit(options.life, (g, progress) => {
    const local = (progress - delay) / (1 - delay)
    if (local <= 0) return
    const tail = easeIn(local)
    g.strokeStyle = PALETTE.line
    g.lineWidth = Math.max(0.1, width * (1 - tail))
    g.beginPath()
    g.moveTo(...polar(originX, originY, options.direction, length * tail * 1.4))
    g.lineTo(...polar(originX, originY, options.direction, length * (0.2 + easeOut(local) * 1.2)))
    g.stroke()
  })
}

export function lines(x: number, y: number, options: LineOptions = {}): void {
  const { count = 7, direction = Math.PI, length = 46, spread = 26, life = 0.3 } = options
  for (let index = 0; index < count; index += 1) {
    speedLine(x, y, { count, direction, length, spread, life })
  }
}

interface TickOptions {
  count?: number
  radius?: number
  length?: number
  direction?: number
  life?: number
  fan?: number
}

export function ticks(x: number, y: number, options: TickOptions = {}): void {
  const { count = 3, radius = 16, length = 9, direction = -0.9, life = 0.4, fan = 0.42 } = options

  emit(life, (g, progress) => {
    const start = radius + length * easeIn(clamp((progress - 0.4) / 0.6)) * 1.25
    const end = radius + length * easeOut(clamp(progress / 0.5)) * 1.25
    if (end - start < 0.6) return

    const halfWidth = 0.07 + 2.2 / (end + 8)
    g.fillStyle = PALETTE.accent
    for (let index = 0; index < count; index += 1) {
      const angle = direction + (index - (count - 1) / 2) * fan
      g.fill(
        polygon([
          polar(x, y, angle, start),
          polar(x, y, angle - halfWidth, end),
          polar(x, y, angle + halfWidth, end),
        ]),
      )
    }
  })
}

interface DonutOptions {
  radius?: number
  vx?: number
  vy?: number
  life?: number
}

const DONUT_TILT = -0.25
const DONUT_SEGMENTS = 48

export function donut(x: number, y: number, options: DonutOptions = {}): void {
  const { radius = 20, vx = 30, vy = -50, life = 1 } = options
  const phase = random(0, TAU)

  emit(life, (g, progress, time) => {
    const size = overshoot(clamp(time / 0.22)) * fadeAfter(progress, 0.6)
    if (size < 0.03) return
    const travel = easeOut(progress) * life

    const hoop = (amount: number, bump: number) =>
      times(DONUT_SEGMENTS, (index): Point => {
        const angle = (index / DONUT_SEGMENTS) * TAU
        const wave = 1 + bump * Math.sin(angle * 9 + phase + time * 2)
        const ex = Math.cos(angle) * radius * size * amount * wave
        const ey = Math.sin(angle) * radius * size * amount * wave * 0.52
        return [
          x + vx * travel + ex * Math.cos(DONUT_TILT) - ey * Math.sin(DONUT_TILT),
          y + vy * travel + ex * Math.sin(DONUT_TILT) + ey * Math.cos(DONUT_TILT),
        ]
      })

    const path = polygon(hoop(1, 0.09), hoop(0.42 + 0.22 * progress, 0.05))
    shadedShape(g, path, 1.5, radius * 0.2, 'evenodd')
  })
}

interface WobbleOptions {
  direction?: 1 | -1
  radius?: number
  life?: number
}

export function wobble(x: number, y: number, options: WobbleOptions = {}): void {
  const { direction = 1, radius = 16, life = 0.45 } = options
  const facing = direction > 0 ? 0 : Math.PI
  const centerX = x - direction * radius

  emit(life, (g, progress) => {
    g.strokeStyle = PALETTE.line
    g.lineWidth = Math.max(0.1, 2.2 * (1 - progress))
    for (const gap of [0, 7]) {
      g.beginPath()
      g.arc(centerX, y, radius + gap + easeOut(progress) * 8, facing - 0.45, facing + 0.45)
      g.stroke()
    }
  })
}

export function sparkle(x: number, y: number, options: { radius?: number; life?: number } = {}) {
  const { radius = 9, life = 0.6 } = options

  emit(life, (g, progress, time) => {
    const size = radius * Math.sin(progress * Math.PI) ** 0.6
    const waist = size * 0.16
    const path = new Path2D()
    path.moveTo(0, -size)
    path.quadraticCurveTo(waist, -waist, size * 0.7, 0)
    path.quadraticCurveTo(waist, waist, 0, size)
    path.quadraticCurveTo(-waist, waist, -size * 0.7, 0)
    path.quadraticCurveTo(-waist, -waist, 0, -size)

    g.translate(x, y)
    g.rotate(Math.sin(time * 3) * 0.2)
    g.fillStyle = PALETTE.fill
    g.fill(path)
    g.strokeStyle = PALETTE.accent
    g.lineWidth = 2
    g.stroke(path)
  })
}
