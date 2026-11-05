const { loadPinned } = require('./pin-module.cjs')
const { softModule } = require('./expo-soft.cjs')

// Builds before 1.5.0 cannot hear: the Remind me screen offers typing instead.
function fallback() {
  return softModule({
    ExpoSpeechRecognitionModule: {
      requestPermissionsAsync: () => Promise.resolve({ granted: false, canAskAgain: false }),
      isRecognitionAvailable: () => false,
      start() {},
      stop() {},
      abort() {},
    },
    useSpeechRecognitionEvent() {},
  })
}

function isOk(mod) {
  return Boolean(mod && mod.ExpoSpeechRecognitionModule && typeof mod.useSpeechRecognitionEvent === 'function')
}

module.exports = loadPinned(() => require('expo-speech-recognition'), isOk, fallback, '__didISpeechError')
