const { loadPinned } = require('./pin-module.cjs')
const { call, softModule } = require('./expo-soft.cjs')

function fallback() {
  return softModule({
    impactAsync: call,
    notificationAsync: call,
    selectionAsync: call,
    ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Soft: 'soft', Rigid: 'rigid' },
    NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  })
}

function isOk(mod) {
  const api = mod?.default && typeof mod.default.impactAsync === 'function' ? mod.default : mod
  return Boolean(api && typeof api.impactAsync === 'function')
}

module.exports = loadPinned(() => require('expo-haptics'), isOk, fallback, '__didIHapticsError')
