const { loadPinned } = require('./pin-module.cjs')

function memory() {
  const box = new Map()
  return {
    getString(key) {
      return box.has(key) ? box.get(key) : undefined
    },
    set(key, value) {
      box.set(key, String(value))
    },
    remove(key) {
      box.delete(key)
    },
    clearAll() {
      box.clear()
    },
  }
}

function fallback() {
  return {
    __esModule: true,
    createMMKV() {
      return memory()
    },
  }
}

function isOk(mod) {
  return Boolean(mod && typeof mod.createMMKV === 'function')
}

module.exports = loadPinned(() => require('react-native-mmkv'), isOk, fallback, '__didIMmkvError')
