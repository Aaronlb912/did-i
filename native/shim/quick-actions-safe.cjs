const { loadPinned } = require('./pin-module.cjs')
const { softModule } = require('./expo-soft.cjs')

// Builds before 1.3.0 have no app icon shortcuts on iPhone.
function fallback() {
  return softModule({
    initial: undefined,
    setItems: () => Promise.resolve(),
    isSupported: () => Promise.resolve(false),
    addListener: () => ({ remove() {} }),
  })
}

function isOk(mod) {
  return Boolean(mod && typeof mod.setItems === 'function' && typeof mod.addListener === 'function')
}

module.exports = loadPinned(() => require('expo-quick-actions'), isOk, fallback, '__didIQuickActionsError')
