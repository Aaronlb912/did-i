const { loadPinned } = require('./pin-module.cjs')
const { softModule } = require('./expo-soft.cjs')

function StatusBar() {
  return null
}

function fallback() {
  return softModule({
    StatusBar,
    default: StatusBar,
  })
}

function isOk(mod) {
  return Boolean(mod && (mod.StatusBar || mod.default))
}

module.exports = loadPinned(() => require('expo-status-bar'), isOk, fallback, '__didIStatusBarError')
