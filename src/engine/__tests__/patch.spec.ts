import { describe, expect, it } from 'vitest'

import { patchMethod } from '../patch'

class Base {
  value(): number {
    return 2
  }
}

class Derived extends Base {}

const addOne = (original: () => number) => () => original() + 1

describe('patchMethod', () => {
  it('wraps an inherited method without touching the parent', () => {
    patchMethod(
      Derived.prototype,
      'value',
      (original) =>
        function value() {
          return original.call(this) * 10
        },
    )

    expect(new Derived().value()).toBe(20)
    expect(new Base().value()).toBe(2)
  })

  it('applies only once per method', () => {
    const target = { value: () => 1 }

    expect(patchMethod(target, 'value', addOne)).toBe(true)
    expect(patchMethod(target, 'value', addOne)).toBe(false)
    expect(target.value()).toBe(2)
  })

  it('ignores missing targets and methods', () => {
    const empty: { value?: () => number } = {}

    expect(patchMethod(undefined as typeof empty | undefined, 'value', (o) => o)).toBe(false)
    expect(patchMethod(empty, 'value', (o) => o)).toBe(false)
  })
})
