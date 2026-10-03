const { loadPinned } = require('./pin-module.cjs')
const { softModule } = require('./expo-soft.cjs')

// A build without expo-updates still loads; the version line just says no update.
function fallback() {
  return softModule({ updateId: null, createdAt: null, isEmbeddedLaunch: true })
}

function isOk(mod) {
  return Boolean(mod && 'updateId' in mod)
}

module.exports = loadPinned(() => require('expo-updates'), isOk, fallback, '__didIUpdatesError')
