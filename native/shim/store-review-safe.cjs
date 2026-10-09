const { loadPinned } = require('./pin-module.cjs')
const { softModule } = require('./expo-soft.cjs')

// No native module (web, older dev clients): say the prompt is not there, so
// RateCard falls back to the store link.
function fallback() {
  return softModule({
    isAvailableAsync: () => Promise.resolve(false),
    hasAction: () => Promise.resolve(false),
    requestReview: () => Promise.resolve(undefined),
    storeUrl: () => null,
  })
}

function isOk(mod) {
  const api = mod?.default && typeof mod.default.requestReview === 'function' ? mod.default : mod
  return Boolean(api && typeof api.requestReview === 'function')
}

module.exports = loadPinned(() => require('expo-store-review'), isOk, fallback, '__didIStoreReviewError')
