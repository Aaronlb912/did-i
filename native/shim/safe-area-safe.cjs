const React = require('react')
const { View } = require('react-native')
const { loadPinned } = require('./pin-module.cjs')

const INSETS = { top: 0, left: 0, right: 0, bottom: 0 }

function useSafeAreaInsets() {
  return INSETS
}

function SafeAreaProvider({ children, style }) {
  return React.createElement(View, { style: { flex: 1, ...style } }, children)
}

function SafeAreaView({ children, style }) {
  return React.createElement(View, { style }, children)
}

function fallback() {
  return {
    __esModule: true,
    default: SafeAreaProvider,
    SafeAreaProvider,
    SafeAreaView,
    useSafeAreaInsets,
    useSafeAreaFrame() {
      return { x: 0, y: 0, width: 390, height: 844 }
    },
    initialWindowMetrics: {
      insets: INSETS,
      frame: { x: 0, y: 0, width: 390, height: 844 },
    },
  }
}

function isOk(mod) {
  return Boolean(mod && typeof mod.useSafeAreaInsets === 'function')
}

module.exports = loadPinned(
  () => require('react-native-safe-area-context'),
  isOk,
  fallback,
  '__didISafeAreaError',
)
