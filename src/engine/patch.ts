type MethodOf<T, K extends keyof T> =
  NonNullable<T[K]> extends (...args: infer Args) => infer Result
    ? (this: T, ...args: Args) => Result
    : never

const patchedKeys = new WeakMap<object, Set<PropertyKey>>()

function isMethod<T, K extends keyof T>(value: T[K] | MethodOf<T, K>): value is MethodOf<T, K> {
  return typeof value === 'function'
}

export function patchMethod<T extends object, K extends keyof T>(
  target: T | undefined,
  key: K,
  wrap: (original: MethodOf<T, K>) => MethodOf<T, K>,
): boolean {
  if (!target) return false

  const original = target[key]
  if (!isMethod<T, K>(original)) return false

  const keys = patchedKeys.get(target) ?? new Set<PropertyKey>()
  if (keys.has(key)) return false

  Object.assign(target, { [key]: wrap(original) })
  patchedKeys.set(target, keys.add(key))
  return true
}
