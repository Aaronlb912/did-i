const { loadPinned } = require('./pin-module.cjs')
const { call, softModule } = require('./expo-soft.cjs')

// Builds before 1.3.7 have no ExpoSecureStore: no key, so the sign-in session
// stays in plain MMKV (native/lib/auth-store.js).
function fallback() {
  return softModule({
    AFTER_FIRST_UNLOCK: 0,
    getItemAsync: () => Promise.resolve(null),
    setItemAsync: call,
    deleteItemAsync: call,
  })
}

function isOk(mod) {
  const api = mod?.default && typeof mod.default.getItemAsync === 'function' ? mod.default : mod
  return Boolean(api && typeof api.getItemAsync === 'function' && typeof api.setItemAsync === 'function')
}

module.exports = loadPinned(() => require('expo-secure-store'), isOk, fallback, '__didISecureStoreError')
