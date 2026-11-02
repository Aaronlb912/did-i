const { loadPinned } = require('./pin-module.cjs')

function fallback() {
  return {
    __esModule: true,
    captureRef: () => Promise.reject(new Error('view capture is not available')),
  }
}

function isOk(mod) {
  return Boolean(mod && typeof mod.captureRef === 'function')
}

module.exports = loadPinned(() => require('react-native-view-shot'), isOk, fallback, '__didIViewShotError')
