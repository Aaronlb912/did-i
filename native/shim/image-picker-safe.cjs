const { loadPinned } = require('./pin-module.cjs')
const { softModule } = require('./expo-soft.cjs')

// Builds before 1.3.0 have no picker: picking backs out as if cancelled.
function fallback() {
  return softModule({
    launchImageLibraryAsync() {
      return Promise.resolve({ canceled: true, assets: null })
    },
    launchCameraAsync() {
      return Promise.resolve({ canceled: true, assets: null })
    },
    requestCameraPermissionsAsync() {
      return Promise.resolve({ granted: false })
    },
    CameraType: { front: 'front', back: 'back' },
  })
}

function isOk(mod) {
  const api = mod?.default && typeof mod.default.launchImageLibraryAsync === 'function' ? mod.default : mod
  return Boolean(api && typeof api.launchImageLibraryAsync === 'function')
}

module.exports = loadPinned(() => require('expo-image-picker'), isOk, fallback, '__didIImagePickerError')
