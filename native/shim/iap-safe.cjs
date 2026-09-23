const { loadPinned } = require('./pin-module.cjs')
const { call, softModule } = require('./expo-soft.cjs')

function listener() {
  return { remove() {} }
}

function fallback() {
  return softModule({
    ErrorCode: { UserCancelled: 'user-cancelled' },
    initConnection: call,
    fetchProducts() {
      return Promise.resolve([])
    },
    requestPurchase() {
      return Promise.reject(new Error('iap'))
    },
    finishTransaction: call,
    purchaseUpdatedListener: listener,
    purchaseErrorListener: listener,
  })
}

function isOk(mod) {
  const api = mod?.default && typeof mod.default.initConnection === 'function' ? mod.default : mod
  return Boolean(api && typeof api.initConnection === 'function' && typeof api.fetchProducts === 'function')
}

module.exports = loadPinned(() => require('expo-iap'), isOk, fallback, '__didIIapError')
