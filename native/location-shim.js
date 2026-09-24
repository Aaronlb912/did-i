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
    return require('react-native/Libraries/Core/Devtools/getDevServer').default().url
  } catch {
    return ''
  }
}
