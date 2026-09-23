const { loadPinned } = require('./pin-module.cjs')
const { call, softModule } = require('./expo-soft.cjs')

function fallback() {
  return softModule({
    setStringAsync: call,
    getStringAsync() {
      return Promise.resolve('')
    },
  })
}

function isOk(mod) {
  const api = mod?.default && typeof mod.default.setStringAsync === 'function' ? mod.default : mod
  return Boolean(api && typeof api.setStringAsync === 'function')
}

module.exports = loadPinned(() => require('expo-clipboard'), isOk, fallback, '__didIClipboardError')
