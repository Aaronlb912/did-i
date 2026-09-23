const { loadPinned } = require('./pin-module.cjs')
const { softModule } = require('./expo-soft.cjs')

function pass() {
  return {}
}

function fallback() {
  return softModule({
    background: pass,
    containerBackground: pass,
    font: pass,
    foregroundStyle: pass,
    padding: pass,
  })
}

function isOk(mod) {
  return Boolean(mod && typeof mod.padding === 'function' && typeof mod.font === 'function')
}

module.exports = loadPinned(
  () => require('@expo/ui/swift-ui/modifiers'),
  isOk,
  fallback,
  '__didIUiError',
)
