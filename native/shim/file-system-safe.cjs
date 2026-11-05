const { loadPinned } = require('./pin-module.cjs')

// No native module (older binary, web): no file can be written, so the backup
// file row is hidden by the caller.
function fallback() {
  return { __esModule: true, File: undefined, Paths: undefined }
}

function isOk(mod) {
  return Boolean(mod && typeof mod.File === 'function' && mod.Paths)
}

module.exports = loadPinned(() => require('expo-file-system'), isOk, fallback, '__didIFileSystemError')
