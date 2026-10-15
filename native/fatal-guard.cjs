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
    // Before the first real screen, let a fatal error reach the native
    // handler: expo-updates (ErrorRecovery) catches it there and rolls a
    // bad OTA back. After that, keep the app up and show the error. A store
    // build with no OTA has nothing to roll back to, so it stays up too.
    let embedded = true
    try {
      embedded = Boolean(require('expo-updates').isEmbeddedLaunch)
    } catch {
      // No expo-updates: treat it as embedded.
    }
    const early = isFatal && !__DEV__ && !global.__didIReady && !embedded
    if ((!isFatal || early) && typeof prev === 'function') prev(error, isFatal)
  })
}

try {
  require('react-native-gesture-handler')
} catch (error) {
  global.__didIGestureError = String((error && error.message) || error)
}
