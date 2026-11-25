export const TAU = Math.PI * 2

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))
export const lerp = (from: number, to: number, t: number) => from + (to - from) * t
export const random = (min: number, max: number) => min + Math.random() * (max - min)
export const easeOut = (t: number) => 1 - (1 - t) ** 3
export const easeIn = (t: number) => t ** 3
export const overshoot = (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2

export function times<T>(count: number, create: (index: number) => T): T[] {
  return Array.from({ length: count }, (_, index) => create(index))
}

const MAX_SPRING_STEP = 0.008
const REST_EPSILON = 0.001

export class Spring {
  velocity = 0
  target: number

  constructor(
    public value: number,
    public stiffness = 300,
    public damping = 20,
  ) {
    this.target = value
  }

  get isResting(): boolean {
    return (
      Math.abs(this.value - this.target) < REST_EPSILON &&
      Math.abs(this.velocity) < REST_EPSILON * 10
    )
  }

  step(seconds: number): number {
    const count = Math.ceil(seconds / MAX_SPRING_STEP)
    const step = seconds / count

    for (let index = 0; index < count; index += 1) {
      const force = -this.stiffness * (this.value - this.target) - this.damping * this.velocity
      this.velocity += force * step
      this.value += this.velocity * step
    }
    return this.value
  }
}
