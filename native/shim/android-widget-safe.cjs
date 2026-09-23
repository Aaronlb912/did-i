const React = require('react')
const { View, Text } = require('react-native')
const { loadPinned } = require('./pin-module.cjs')

function box(name) {
  function Stub({ children, style }) {
    return React.createElement(View, { style }, children)
  }
  Stub.displayName = name
  return Stub
}

function fallback() {
  return {
    __esModule: true,
    FlexWidget: box('FlexWidget'),
    TextWidget: Text,
    registerWidgetTaskHandler() {},
    requestWidgetUpdate() {
      return Promise.resolve()
    },
  }
}

function isOk(mod) {
  return Boolean(
    mod &&
      typeof mod.requestWidgetUpdate === 'function' &&
      typeof mod.registerWidgetTaskHandler === 'function' &&
      mod.FlexWidget &&
      mod.TextWidget,
  )
}

module.exports = loadPinned(
  () => require('react-native-android-widget'),
  isOk,
  fallback,
  '__didIAndroidWidgetError',
)
