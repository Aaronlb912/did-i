const { loadPinned } = require('./pin-module.cjs')
const { softModule } = require('./expo-soft.cjs')

function fallback() {
  return softModule({})
}

function isOk(mod) {
  return Boolean(mod && mod.Host && mod.DropdownMenu && mod.ModalBottomSheet && mod.RNHostView)
}

module.exports = loadPinned(() => require('@expo/ui/jetpack-compose'), isOk, fallback, '__didIUiError')
