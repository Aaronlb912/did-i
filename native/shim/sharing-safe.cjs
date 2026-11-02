const { loadPinned } = require('./pin-module.cjs')
const { softModule } = require('./expo-soft.cjs')

// No native module (web, older dev clients): sharing is not available, so the
// year falls back to the text share.
function fallback() {
  return softModule({
    isAvailableAsync: () => Promise.resolve(false),
    shareAsync: () => Promise.reject(new Error('sharing is not available')),
  })
}

function isOk(mod) {
  const api = mod?.default && typeof mod.default.shareAsync === 'function' ? mod.default : mod
  return Boolean(api && typeof api.shareAsync === 'function' && typeof api.isAvailableAsync === 'function')
}

module.exports = loadPinned(() => require('expo-sharing'), isOk, fallback, '__didISharingError')
