import { TAU } from './math'
import { PALETTE } from './palette'

const EVERYWHERE = 1e4

export type Circle = readonly [x: number, y: number, radius: number]
export type Point = readonly [x: number, y: number]

function tracePolygon(path: Path2D, points: readonly Point[]): void {
  points.forEach(([x, y], index) => {
    if (index === 0) path.moveTo(x, y)
    else path.lineTo(x, y)
  })
  path.closePath()
}

export function polygon(...rings: Array<readonly Point[]>): Path2D {
  const path = new Path2D()
  for (const ring of rings) tracePolygon(path, ring)
  return path
}

function outline(g: CanvasRenderingContext2D, path: Path2D, width: number): void {
  g.save()
  g.lineWidth = width * 2
  g.strokeStyle = PALETTE.line
  g.stroke(path)
  g.restore()
}

function floodShade(g: CanvasRenderingContext2D): void {
  g.fillStyle = PALETTE.shade
  g.fillRect(-EVERYWHERE, -EVERYWHERE, EVERYWHERE * 2, EVERYWHERE * 2)
}

export function shadedShape(
  g: CanvasRenderingContext2D,
  path: Path2D,
  lineWidth = 1.5,
  offset = 3,
  rule: CanvasFillRule = 'nonzero',
): void {
  outline(g, path, lineWidth)
  g.save()
  g.clip(path, rule)
  floodShade(g)
  g.translate(-offset * 0.7, -offset)
  g.fillStyle = PALETTE.fill
  g.fill(path, rule)
  g.restore()
}

export function cloud(
  g: CanvasRenderingContext2D,
  circles: readonly Circle[],
  arcs: boolean,
): void {
  const path = new Path2D()
  for (const [x, y, radius] of circles) {
    if (radius <= 0.3) continue
    path.moveTo(x + radius, y)
    path.arc(x, y, radius, 0, TAU)
  }
  outline(g, path, 1.5)

  const lead = circles[0]?.[2] ?? 8
  g.save()
  g.clip(path)
  floodShade(g)
  g.save()
  g.translate(lead * 0.15, -lead * 0.39)
  g.fillStyle = PALETTE.fill
  g.fill(path)
  g.restore()
  if (arcs) strokeCloudArcs(g, circles)
  g.restore()
}

function strokeCloudArcs(g: CanvasRenderingContext2D, circles: readonly Circle[]): void {
  g.strokeStyle = PALETTE.line
  g.lineWidth = 1.1
  g.beginPath()
  for (const [x, y, radius] of circles) {
    if (radius <= 3) continue
    g.moveTo(x + Math.cos(-2.7) * radius, y + Math.sin(-2.7) * radius)
    g.arc(x, y, radius, -2.7, -0.5)
  }
  g.stroke()
}
