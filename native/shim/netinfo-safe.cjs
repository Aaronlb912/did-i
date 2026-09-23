const { loadPinned } = require('./pin-module.cjs')

function noopSub() {
  return () => {}
}

const offline = {
  isConnected: false,
  isInternetReachable: false,
  type: 'unknown',
}

const online = {
  isConnected: true,
  isInternetReachable: true,
  type: 'wifi',
}

function fallback() {
  const NetInfo = {
    fetch() {
      return Promise.resolve(online)
    },
    addEventListener(listener) {
      listener(online)
      return noopSub()
    },
    useNetInfo() {
      return online
    },
  }
  return {
    __esModule: true,
    default: NetInfo,
    ...NetInfo,
  }
}

function isOk(mod) {
  const base = mod?.default ?? mod
  return Boolean(base && typeof base.fetch === 'function')
}

module.exports = loadPinned(
  () => require('@react-native-community/netinfo'),
  isOk,
  fallback,
  '__didINetinfoError',
)
