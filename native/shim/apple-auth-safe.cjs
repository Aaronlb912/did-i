const { loadPinned } = require('./pin-module.cjs')
const { softModule, view } = require('./expo-soft.cjs')

const Button = view('AppleAuthenticationButton')

function fallback() {
  return softModule({
    AppleAuthenticationButton: Button,
    AppleAuthenticationButtonType: { SIGN_IN: 0, CONTINUE: 1, SIGN_UP: 2 },
    AppleAuthenticationButtonStyle: { WHITE: 0, WHITE_OUTLINE: 1, BLACK: 2 },
    isAvailableAsync() {
      return Promise.resolve(false)
    },
    signInAsync() {
      return Promise.reject(new Error('apple'))
    },
  })
}

function isOk(mod) {
  return Boolean(mod && (mod.AppleAuthenticationButton || mod.isAvailableAsync))
}

module.exports = loadPinned(
  () => require('expo-apple-authentication'),
  isOk,
  fallback,
  '__didIAppleAuthError',
)
