const { loadPinned } = require('./pin-module.cjs')
const { softModule, view } = require('./expo-soft.cjs')

// Builds before 1.3.0 have no camera: the scan screen says so instead.
function fallback() {
  return softModule({
    CameraView: view('CameraView'),
    requestCameraPermissionsAsync() {
      return Promise.resolve({ granted: false, canAskAgain: false })
    },
  })
}

function isOk(mod) {
  return Boolean(mod && mod.CameraView && typeof mod.requestCameraPermissionsAsync === 'function')
}

module.exports = loadPinned(() => require('expo-camera'), isOk, fallback, '__didICameraError')
