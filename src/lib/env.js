/** Vite uses import.meta.env; Expo uses app.config extra. */
export function isReactNative() {
  return typeof navigator !== 'undefined' && navigator.product === 'ReactNative'
}

export function env(name) {
  if (typeof import.meta !== 'undefined' && import.meta.env?.[name] != null) {
    return String(import.meta.env[name]).trim()
  }
  try {
    const Constants = require('expo-constants').default
    const fromExtra = Constants.expoConfig?.extra?.[name]
    if (fromExtra != null) return String(fromExtra).trim()
  } catch {
    // Web or tests.
  }
  if (typeof process !== 'undefined' && process.env?.[name] != null) {
    return String(process.env[name]).trim()
  }
  return ''
}
