const { loadPinned } = require('./pin-module.cjs')
const { call, softModule } = require('./expo-soft.cjs')

function parse(url) {
  try {
    const parsed = new URL(String(url))
    const queryParams = {}
    parsed.searchParams.forEach((value, key) => {
      queryParams[key] = value
    })
    return {
      hostname: parsed.hostname,
      path: parsed.pathname,
      queryParams,
    }
  } catch {
    return { hostname: '', path: '', queryParams: {} }
  }
}

function fallback() {
  return softModule({
    parse,
    openURL: call,
    openSettings: call,
    getInitialURL() {
      return Promise.resolve(null)
    },
    addEventListener() {
      return { remove() {} }
    },
    createURL(path) {
      return `didi://${String(path || '').replace(/^\/+/, '')}`
    },
  })
}

function isOk(mod) {
  const api = mod?.default && typeof mod.default.parse === 'function' ? mod.default : mod
  return Boolean(api && typeof api.parse === 'function' && typeof api.addEventListener === 'function')
}

module.exports = loadPinned(() => require('expo-linking'), isOk, fallback, '__didILinkingError')
