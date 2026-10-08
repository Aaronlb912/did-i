const { loadPinned } = require('./pin-module.cjs')
const { softModule } = require('./expo-soft.cjs')

// Builds before 1.3.1 have no ExpoBattery: never low power, never a change.
function fallback() {
  return softModule({
    isLowPowerModeEnabledAsync: () => Promise.resolve(false),
    addLowPowerModeListener: () => ({ remove() {} }),
  })
}

function isOk(mod) {
  const api = mod?.default && typeof mod.default.isLowPowerModeEnabledAsync === 'function' ? mod.default : mod
  return Boolean(api && typeof api.isLowPowerModeEnabledAsync === 'function')
}

module.exports = loadPinned(() => require('expo-battery'), isOk, fallback, '__didIBatteryError')
