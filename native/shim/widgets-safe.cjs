const { loadPinned } = require('./pin-module.cjs')
const { softModule } = require('./expo-soft.cjs')

function fallback() {
  return softModule({
    addUserInteractionListener() {
      return { remove() {} }
    },
    createWidget() {
      return {}
    },
  })
}

function isOk(mod) {
  return Boolean(mod && (typeof mod.addUserInteractionListener === 'function' || typeof mod.createWidget === 'function'))
}

module.exports = loadPinned(() => require('expo-widgets'), isOk, fallback, '__didIWidgetsError')
