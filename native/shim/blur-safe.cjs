const { loadPinned } = require('./pin-module.cjs')
const { softModule, view } = require('./expo-soft.cjs')

const BlurView = view('BlurView')
const BlurTargetView = view('BlurTargetView')

function fallback() {
  return softModule({
    default: BlurView,
    BlurView,
    BlurTargetView,
  })
}

function isOk(mod) {
  return Boolean(mod && mod.BlurView && mod.BlurTargetView)
}

module.exports = loadPinned(() => require('expo-blur'), isOk, fallback, '__didIBlurError')
