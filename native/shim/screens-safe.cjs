// RootNavigator pulls react-native-screens at startup. Its entry
// imports the TurboModule as a default export.

const React = require('react')
const { View } = require('react-native')
const { loadPinned } = require('./pin-module.cjs')

function host(name) {
  function Stub({ children, style }) {
    return React.createElement(View, { style: [{ flex: 1 }, style] }, children)
  }
  Stub.displayName = name
  return Stub
}

function fallback() {
  const Screen = host('Screen')
  const ScreenStack = host('ScreenStack')
  const ScreenStackItem = host('ScreenStackItem')
  return {
    __esModule: true,
    default: Screen,
    enableScreens() {},
    enableFreeze() {},
    screensEnabled() {
      return false
    },
    freezeEnabled() {
      return false
    },
    compatibilityFlags: {},
    featureFlags: {},
    Screen,
    InnerScreen: Screen,
    ScreenStack,
    ScreenStackItem,
    ScreenContainer: host('ScreenContainer'),
    FullWindowOverlay: host('FullWindowOverlay'),
  }
}

function isOk(mod) {
  return Boolean(mod && mod.ScreenStack && mod.ScreenStackItem)
}

module.exports = loadPinned(() => require('react-native-screens'), isOk, fallback, '__didIScreensError')
