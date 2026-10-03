import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { GEM_PACKS, gemPack } from '../../src/lib/gem-packs.js'
import { readShelf, writeShelf } from '../../src/lib/board-shelf.js'
import { claimGemPurchases } from '../../src/lib/gem-claim.js'
import { SHELF_IN } from '../../src/lib/cloud-sync.js'
import { readUser } from '../../src/lib/account.js'
import { submitGemPurchase } from '../../src/lib/gem-verify.js'
import { addGemsShelf } from '../../src/lib/purse.js'

let connected = false
let linked = false
// One store connection per app run. Everyone who asks shares it, and the
// answer (even "no products yet") is kept so the gem page never waits twice.
let pending = null
let settled = ''
const prices = new Map()
const liveSku = new Map()
let purchaseSub = null
let errorSub = null
let iap = null

// expo-iap needs a dev build with NitroModules. Skip in Expo Go.
function inExpoGo() {
  return Constants.appOwnership === 'expo'
}

// Lazy load so the rest of the app can boot without the store native module.
async function loadIap() {
  if (iap) return iap
  if (inExpoGo()) return null
  try {
    iap = await import('expo-iap')
    return iap
  } catch (error) {
    console.warn('gem iap load', error?.message || error)
    return null
  }
}

function iapApi(mod) {
  if (!mod) return null
  if (typeof mod.initConnection === 'function' || typeof mod.requestPurchase === 'function') return mod
  return mod.default || mod
}

export function iapPossible() {
  if (inExpoGo()) return false
  return Platform.OS === 'android' || Platform.OS === 'ios'
}

export function iapReady() {
  return linked
}

function priceOf(item) {
  return String(item?.displayPrice || item?.localizedPrice || item?.price || item?.localizedPriceString || '')
}

function rememberProduct(item) {
  const id = String(item?.id || item?.productId || item?.sku || '')
  if (!id) return
  const label = priceOf(item)
  if (label) prices.set(id, label)
  const pack = GEM_PACKS.find((row) => row.storeId === id || row.id === id)
  if (pack) liveSku.set(pack.id, id)
}

function skusToAsk() {
  const ids = []
  for (const pack of GEM_PACKS) {
    ids.push(pack.storeId)
    if (pack.id && pack.id !== pack.storeId) ids.push(pack.id)
  }
  return ids
}

export function storePrice(packId) {
  const pack = gemPack(packId)
  if (!pack) return ''
  const sku = liveSku.get(pack.id) || pack.storeId
  return prices.get(sku) || prices.get(pack.storeId) || ''
}

async function creditPurchase(purchase) {
  const mod = await loadIap()
  const out = await submitGemPurchase(purchase)
  if (out.miss) return out
  const claimed = await claimGemPurchases()
  if (claimed.gems > 0) {
    const shelf = writeShelf(addGemsShelf(readShelf(), claimed.gems))
    try {
      global.window?.dispatchEvent?.({ type: SHELF_IN, detail: shelf })
    } catch {
      // ok
    }
  }
  if (mod?.finishTransaction) {
    try {
      await mod.finishTransaction({ purchase, isConsumable: true })
    } catch {
      // Already finished or store will retry.
    }
  }
  return out
}

// A buy that was paid but never credited (no signal, app closed) stays unfinished
// with the store. Credit it on the next connect; the server ignores repeats.
async function retryUnfinished(api) {
  if (!api?.getAvailablePurchases || !(await readUser())) return
  try {
    const open = await api.getAvailablePurchases()
    for (const purchase of open || []) {
      const id = String(purchase?.productId || purchase?.id || '')
      if (GEM_PACKS.some((row) => row.storeId === id)) await creditPurchase(purchase)
    }
  } catch {
    // Next connect tries again.
  }
}

export function initGemIap() {
  if (!iapPossible()) return Promise.resolve('skip')
  if (settled && settled !== 'fail') return Promise.resolve(settled)
  if (!pending) {
    pending = connectStore().then((out) => {
      settled = out
      pending = null
      return out
    })
  }
  return pending
}

async function loadProducts(fetchProducts) {
  const result = await fetchProducts({ skus: skusToAsk(), type: 'in-app' })
  const list = Array.isArray(result) ? result : result?.products || result?.value || []
  if (!list.length) return
  prices.clear()
  liveSku.clear()
  for (const item of list) rememberProduct(item)
}

async function connectStore() {
  try {
    const mod = await loadIap()
    if (!mod) return 'fail'

    const api = iapApi(mod)
    const {
      ErrorCode,
      fetchProducts,
      initConnection,
      purchaseErrorListener,
      purchaseUpdatedListener,
    } = api

    await initConnection()
    linked = true
    connected = true
    purchaseSub?.remove()
    errorSub?.remove()
    purchaseSub = purchaseUpdatedListener(async (purchase) => {
      await creditPurchase(purchase)
    })
    errorSub = purchaseErrorListener((error) => {
      if (error?.code === ErrorCode.UserCancelled) return
      console.warn('gem iap', error?.message || error)
    })
    await loadProducts(fetchProducts)
    retryUnfinished(api)
    return liveSku.size ? 'ok' : 'empty'
  } catch (error) {
    console.warn('gem iap init', error?.message || error)
    return linked ? 'empty' : 'fail'
  }
}

export async function buyGemPack(packId) {
  const pack = gemPack(packId)
  if (!pack) return { miss: 'pack' }
  if (!iapPossible()) return { miss: 'app' }

  const mod = await loadIap()
  if (!mod) return { miss: 'setup' }

  if (!linked) {
    await initGemIap()
    if (!linked) return { miss: 'setup' }
  }

  const api = iapApi(mod)
  // Google Play only sells a pack it handed over earlier in this session. A
  // load that came back empty at start would fail every buy, so ask again.
  if (Platform.OS === 'android' && !liveSku.has(pack.id)) {
    try {
      await loadProducts(api.fetchProducts)
    } catch {
      // The buy below says what the store did.
    }
    if (!liveSku.has(pack.id)) return { miss: 'store', code: 'not-listed' }
  }
  const sku = liveSku.get(pack.id) || pack.storeId
  try {
    await api.requestPurchase({
      request: {
        apple: { sku },
        google: { skus: [sku] },
      },
      type: 'in-app',
    })
    return { miss: '' }
  } catch (error) {
    if (error?.code === api.ErrorCode?.UserCancelled) return { miss: 'cancel' }
    console.warn('gem iap buy', error?.code, error?.message || error)
    // Play's own words (response code, debug message) say why it refused.
    const why = String(error?.message || '').replace(/s+/g, ' ').trim().slice(0, 160)
    return { miss: 'store', code: [error?.code, why].filter(Boolean).join(': ') }
  }
}
