const { loadPinned } = require('./pin-module.cjs')

// No native module (older binary, web): nothing can be saved to Photos, so the
// Save to Photos row is hidden by the caller.
function fallback() {
  return { __esModule: true, Asset: undefined, requestPermissionsAsync: undefined }
}

function isOk(mod) {
  return Boolean(mod && typeof mod.requestPermissionsAsync === 'function' && mod.Asset && typeof mod.Asset.create === 'function')
}

module.exports = loadPinned(() => require('expo-media-library'), isOk, fallback, '__didIMediaLibraryError')
