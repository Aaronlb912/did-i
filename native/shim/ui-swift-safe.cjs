const { loadPinned } = require('./pin-module.cjs')
const { softModule, view } = require('./expo-soft.cjs')

function fallback() {
  return softModule({
    Button: view('Button'),
    HStack: view('HStack'),
    VStack: view('VStack'),
    Text: view('Text'),
  })
}

function isOk(mod) {
  return Boolean(mod && mod.Button && mod.Text && mod.HStack && mod.VStack)
}

module.exports = loadPinned(() => require('@expo/ui/swift-ui'), isOk, fallback, '__didIUiError')
