// SwipeBackShell and SwipeCard default-import Gesture from RNGH.
// initialize() and the Gesture getter can throw on `.default`.

const React = require('react')
const { View } = require('react-native')
const { loadPinned } = require('./pin-module.cjs')

function gestureChain() {
  const g = {}
  const link = () => g
  ;[
    'activeOffsetX',
    'failOffsetX',
    'failOffsetY',
    'onBegin',
    'onUpdate',
    'onEnd',
    'onFinalize',
    'enabled',
    'simultaneousWithExternalGesture',
    'withTestId',
  ].forEach((name) => {
    g[name] = link
  })
  return g
}

const Gesture = {
  Pan() {
    return gestureChain()
  },
  Tap() {
    return gestureChain()
  },
  LongPress() {
    return gestureChain()
  },
}

function GestureDetector({ children }) {
  return children
}

function GestureHandlerRootView({ children, style }) {
  return React.createElement(View, { style }, children)
}

function fallback() {
  return {
    __esModule: true,
    default: GestureHandlerRootView,
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
  }
}

function isOk(mod) {
  return Boolean(
    mod &&
      mod.Gesture &&
      typeof mod.Gesture.Pan === 'function' &&
      mod.GestureDetector &&
      mod.GestureHandlerRootView,
  )
}

module.exports = loadPinned(
  () => require('react-native-gesture-handler'),
  isOk,
  fallback,
  '__didIGestureError',
)
