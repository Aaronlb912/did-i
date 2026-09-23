// Reanimated 4 pulls this in at require time. A broken interop here can
// abort the whole bundle before our reanimated-safe fallback runs.

const { loadPinned } = require('./pin-module.cjs')

function noop() {}

function fallback() {
  const api = {
    runOnUISync(fn) {
      if (typeof fn === 'function') fn()
    },
    runOnUI(fn) {
      return (...args) => {
        if (typeof fn === 'function') fn(...args)
      }
    },
    runOnJS(fn) {
      return (...args) => {
        if (typeof fn === 'function') fn(...args)
      }
    },
    createWorkletRuntime() {
      return {}
    },
    scheduleOnUI: noop,
    scheduleOnRN: noop,
    isWorkletFunction() {
      return false
    },
    makeShareableCloneOnUIRecursive(value) {
      return value
    },
    toggleSlowAnimationsOnUIRuntime: noop,
  }
  return {
    __esModule: true,
    default: api,
    ...api,
  }
}

function isOk(mod) {
  const base = mod?.default ?? mod
  return Boolean(base && typeof base.runOnUISync === 'function')
}

module.exports = loadPinned(
  () => require('react-native-worklets'),
  isOk,
  fallback,
  '__didIWorkletsError',
)
