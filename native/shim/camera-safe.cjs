const { loadPinned } = require('./pin-module.cjs')
const { softModule, view } = require('./expo-soft.cjs')

// Builds before 1.3.0 have no camera: the scan screen says so instead.
function fallback() {
  return softModule({
    CameraView: view('CameraView'),
    Camera: {
      requestCameraPermissionsAsync() {
        return Promise.resolve({ granted: false, canAskAgain: false })
      },
    },
  })
}

// expo-camera keeps the permission calls on Camera, not as top-level exports.
function isOk(mod) {
  return Boolean(mod && mod.CameraView && typeof mod.Camera?.requestCameraPermissionsAsync === 'function')
}

module.exports = loadPinned(() => require('expo-camera'), isOk, fallback, '__didICameraError')
