const { loadPinned } = require('./pin-module.cjs')

function fallback() {
  const extra = global.__didIExpoExtra || {}
  const expoConfig = { extra, name: 'Did I', slug: 'did-i' }
  const Constants = {
    expoConfig,
    manifest: expoConfig,
    appOwnership: 'standalone',
    platform: global.__didIPlatform || 'ios',
  }
  return {
    __esModule: true,
    default: Constants,
    ...Constants,
  }
}

function isOk(mod) {
  const base = mod?.default ?? mod
  return Boolean(base && (base.expoConfig || base.manifest))
}

module.exports = loadPinned(() => require('expo-constants'), isOk, fallback, '__didIConstantsError')
