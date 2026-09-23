const { loadPinned } = require('./pin-module.cjs')
const { softModule } = require('./expo-soft.cjs')

function fallback() {
  return softModule({
    NitroModules: {
      createHybridObject() {
        throw new Error('nitro')
      },
    },
  })
}

function isOk(mod) {
  return Boolean(mod && mod.NitroModules && typeof mod.NitroModules.createHybridObject === 'function')
}

module.exports = loadPinned(
  () => require('react-native-nitro-modules'),
  isOk,
  fallback,
  '__didINitroError',
)
