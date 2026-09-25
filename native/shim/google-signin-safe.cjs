const { loadPinned } = require('./pin-module.cjs')
const { softModule } = require('./expo-soft.cjs')

// A build without the native Google module still loads; sign-in just fails soft.
function fallback() {
  return softModule({
    GoogleSignin: {
      configure() {},
      hasPlayServices() {
        return Promise.reject(Object.assign(new Error('google'), { code: 'PLAY_SERVICES_NOT_AVAILABLE' }))
      },
      signIn() {
        return Promise.reject(new Error('google'))
      },
    },
    statusCodes: {
      SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
      IN_PROGRESS: 'IN_PROGRESS',
      PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    },
  })
}

function isOk(mod) {
  return Boolean(mod && mod.GoogleSignin && mod.GoogleSignin.signIn)
}

module.exports = loadPinned(
  () => require('@react-native-google-signin/google-signin'),
  isOk,
  fallback,
  '__didIGoogleSignInError',
)
