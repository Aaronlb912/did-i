/** Vite uses import.meta.env; Expo uses app.config extra. */
export function isReactNative() {
  return typeof navigator !== 'undefined' && navigator.product === 'ReactNative'
}

export function env(name) {
  if (typeof import.meta !== 'undefined' && import.meta.env?.[name] != null) {
    return String(import.meta.env[name]).trim()
  }
  const fromExtra = globalThis.__didIExpoExtra?.[name]
  if (fromExtra != null) return String(fromExtra).trim()
  if (typeof process !== 'undefined' && process.env?.[name] != null) {
    return String(process.env[name]).trim()
  }
  return ''
}
