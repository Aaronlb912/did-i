// CheerBurst, mast icons, and purse icons default-import react-native-svg.
// Touching Svg/Path can throw on `.default` if the native module is missing.

const React = require('react')
const { View } = require('react-native')
const { loadPinned } = require('./pin-module.cjs')

function stub(name) {
  function Stub(props) {
    const { children, ...rest } = props || {}
    return React.createElement(View, rest, children)
  }
  Stub.displayName = name
  return Stub
}

const Svg = stub('Svg')
const Path = stub('Path')
const Circle = stub('Circle')
const Ellipse = stub('Ellipse')
const Line = stub('Line')
const Polygon = stub('Polygon')

function fallback() {
  return {
    __esModule: true,
    __didISvgFallback: true,
    default: Svg,
    Svg,
    Path,
    Circle,
    Ellipse,
    Line,
    Polygon,
  }
}

function isOk(mod) {
  const root = mod && (mod.default || mod.Svg)
  return Boolean(root && mod.Path && mod.Circle && mod.Line)
}

module.exports = loadPinned(() => require('react-native-svg'), isOk, fallback, '__didISvgError')
