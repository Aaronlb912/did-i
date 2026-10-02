const { loadPinned } = require('./pin-module.cjs')
const { softModule } = require('./expo-soft.cjs')

// Builds before 1.3.0 have no manipulator; the picker is off there too.
function fallback() {
  return softModule({
    SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
    manipulateAsync() {
      return Promise.reject(new Error('image manipulator missing'))
    },
  })
}

function isOk(mod) {
  const api = mod?.default && typeof mod.default.manipulateAsync === 'function' ? mod.default : mod
  return Boolean(api && typeof api.manipulateAsync === 'function')
}

module.exports = loadPinned(() => require('expo-image-manipulator'), isOk, fallback, '__didIImageManipulatorError')
