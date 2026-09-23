// Must load before any other native module. Production React Native
// aborts the process when the default fatal handler runs. Record the
// error and leave the process up so the boot screen can show it.

const utils = global.ErrorUtils
if (utils && typeof utils.setGlobalHandler === 'function') {
  const prev = typeof utils.getGlobalHandler === 'function' ? utils.getGlobalHandler() : null
  global.__didIPrevErrorHandler = prev
  utils.setGlobalHandler((error, isFatal) => {
    global.__didIFatal = {
      message: String((error && error.message) || error || 'error'),
      stack: String((error && error.stack) || ''),
      isFatal: Boolean(isFatal),
    }
    if (!isFatal && typeof prev === 'function') prev(error, isFatal)
  })
}

try {
  require('react-native-gesture-handler')
} catch (error) {
  global.__didIGestureError = String((error && error.message) || error)
}
