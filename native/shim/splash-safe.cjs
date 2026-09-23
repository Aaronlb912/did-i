const { loadPinned } = require('./pin-module.cjs')
const { call, softModule } = require('./expo-soft.cjs')

function fallback() {
  return softModule({
    preventAutoHideAsync: call,
    hideAsync: call,
  })
}

function isOk(mod) {
  const api = mod?.default && typeof mod.default.hideAsync === 'function' ? mod.default : mod
  return Boolean(api && typeof api.hideAsync === 'function')
}

module.exports = loadPinned(() => require('expo-splash-screen'), isOk, fallback, '__didISplashError')
