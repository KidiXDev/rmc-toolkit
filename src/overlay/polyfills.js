if (typeof globalThis === 'undefined') {
  window.globalThis = window
}
if (typeof queueMicrotask !== 'function') {
  window.queueMicrotask = function (callback) {
    Promise.resolve().then(callback)
  }
}
if (!Object.fromEntries) {
  Object.fromEntries = function (entries) {
    var result = {}
    for (var entry of entries) result[entry[0]] = entry[1]
    return result
  }
}
if (!Array.prototype.flat) {
  Object.defineProperty(Array.prototype, 'flat', {
    configurable: true,
    writable: true,
    value: function () {
      return Array.prototype.concat.apply([], this)
    },
  })
}
if (!Array.prototype.flatMap) {
  Object.defineProperty(Array.prototype, 'flatMap', {
    configurable: true,
    writable: true,
    value: function (callback, self) {
      return Array.prototype.concat.apply([], this.map(callback, self))
    },
  })
}
