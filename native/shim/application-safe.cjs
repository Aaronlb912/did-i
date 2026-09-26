const { loadPinned } = require('./pin-module.cjs')
const { softModule } = require('./expo-soft.cjs')

// A build without expo-application still loads; the invite referrer is just empty.
function fallback() {
  return softModule({
    getInstallReferrerAsync() {
      return Promise.resolve('')
    },
  })
}

function isOk(mod) {
  return Boolean(mod && mod.getInstallReferrerAsync)
}

module.exports = loadPinned(() => require('expo-application'), isOk, fallback, '__didIApplicationError')
