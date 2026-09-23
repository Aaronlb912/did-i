const { loadPinned } = require('./pin-module.cjs')
const { softModule } = require('./expo-soft.cjs')

function fallback() {
  return softModule({
    getDocumentAsync() {
      return Promise.resolve({ canceled: true })
    },
  })
}

function isOk(mod) {
  const api = mod?.default && typeof mod.default.getDocumentAsync === 'function' ? mod.default : mod
  return Boolean(api && typeof api.getDocumentAsync === 'function')
}

module.exports = loadPinned(
  () => require('expo-document-picker'),
  isOk,
  fallback,
  '__didIDocumentPickerError',
)
