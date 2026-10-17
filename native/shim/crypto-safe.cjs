const { loadPinned } = require('./pin-module.cjs')
const { softModule } = require('./expo-soft.cjs')

// Builds before 1.3.7 have no ExpoCrypto: no random key, so the sign-in session
// stays in plain MMKV (native/lib/auth-store.js).
function fallback() {
  return softModule({ getRandomBytes: null })
}

function isOk(mod) {
  const api = mod?.default && typeof mod.default.getRandomBytes === 'function' ? mod.default : mod
  return Boolean(api && typeof api.getRandomBytes === 'function')
}

module.exports = loadPinned(() => require('expo-crypto'), isOk, fallback, '__didICryptoError')
