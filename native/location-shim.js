// React Native has no window.location, and window is global, so whatever we
// define here is also the global `location`. Expo's async chunk loader
// (buildUrlForBundle) prefers `location.origin` when a global location exists
// and calls .replace on it. A location with no origin makes every import()
// throw "Cannot read property 'replace' of undefined" in dev, where Metro
// splits each import() into a chunk fetched from the dev server.

export function originOf(serverUrl) {
  return typeof serverUrl === 'string' ? serverUrl.replace(/\/+$/, '') : ''
}

export function makeLocation(serverUrl) {
  return { hash: '#/', origin: originOf(serverUrl) }
}

export function devServerUrl() {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return ''
  try {
    // The bundle URL points at the dev server; no deprecated deep import needed.
    const source = require('react-native').NativeModules?.SourceCode
    const script = String(source?.getConstants?.().scriptURL || source?.scriptURL || '')
    const hit = /^(https?:\/\/[^/]+)/.exec(script)
    return hit ? `${hit[1]}/` : ''
  } catch {
    return ''
  }
}
