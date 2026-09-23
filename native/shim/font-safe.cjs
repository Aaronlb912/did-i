const { loadPinned } = require('./pin-module.cjs')
const { softModule } = require('./expo-soft.cjs')

function fallback() {
  return softModule({
    useFonts() {
      return [true, null]
    },
    loadAsync() {
      return Promise.resolve()
    },
    isLoaded() {
      return true
    },
  })
}

function isOk(mod) {
  return Boolean(mod && typeof mod.useFonts === 'function')
}

module.exports = loadPinned(() => require('expo-font'), isOk, fallback, '__didIFontError')
