import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { GEM_PACKS, gemPack } from '../../src/lib/gem-packs.js'
import { readShelf, writeShelf } from '../../src/lib/board-shelf.js'
import { claimGemPurchases } from '../../src/lib/gem-claim.js'
import { SHELF_IN } from '../../src/lib/cloud-sync.js'
import { readUser } from '../../src/lib/account.js'
import { submitGemPurchase } from '../../src/lib/gem-verify.js'
import { addGemsShelf } from '../../src/lib/purse.js'
import { t } from '../../src/lib/i18n.js'
import { showToast } from '../lib/toast-queue.js'

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
  // Play answers an id it does not sell (the short gems_10) with a priceless
  // "not-found" stand-in. Taking that as the pack sent every Android buy for
  // gems_10, which Play then had no product for.
  const status = item?.productStatusAndroid
  if (status && status !== 'ok') return
  const label = priceOf(item)
  if (!label) return
  prices.set(id, label)
  const pack = GEM_PACKS.find((row) => row.storeId === id || row.id === id)
  if (!pack) return
  // The full store id wins over a short one that happens to answer too.
  if (liveSku.get(pack.id) === pack.storeId && id !== pack.storeId) return
  liveSku.set(pack.id, id)
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

// The account id a buy was made for (set on the buy since 1.x). Older buys
// carry none and credit whoever is signed in, as before.
function buyOwner(purchase) {
  return String(purchase?.appAccountToken || purchase?.obfuscatedAccountIdAndroid || '').toLowerCase()
}

// gem-iap misses that will never credit, so the store must close the buy.
export const FINISH_UNCREDITED = new Set(['test', 'refunded'])

async function creditPurchase(purchase) {
  const mod = await loadIap()
  const owner = buyOwner(purchase)
  // Bought on another account on this phone: leave it open for that account.
  if (owner) {
    const user = await readUser()
    if (user && owner !== String(user.id).toLowerCase()) return { miss: 'other' }
  }
  const out = await submitGemPurchase(purchase)
  // A test buy from an account not on the server's list never credits. Close
  // it with the store anyway, or Play keeps it open and blocks that pack.
  // A refunded buy never credits either. 'receipt' stays open: gem-iap also
  // says it when the store has not caught up yet (Apple 404), so it can retry.
  if (FINISH_UNCREDITED.has(out.miss) && mod?.finishTransaction) {
    try {
      await mod.finishTransaction({ purchase, isConsumable: true })
    } catch {
      // Already finished.
    }
  }
  if (out.miss) return out
  const claimed = await claimAndCredit()
  if (mod?.finishTransaction) {
    try {
      await mod.finishTransaction({ purchase, isConsumable: true })
    } catch {
      // Already finished or store will retry.
    }
  }
  return { ...out, gems: claimed.gems }
}

// A test buy from an account the server does not credit (gem-iap gate.js).
function testBuyToast() {
  showToast({ id: 'gems-test-miss', kind: 'error', text: t('gems.testMiss'), ms: 6000 })
}

function creditMissToast() {
  showToast({
    id: 'gems-credit-miss',
    kind: 'error',
    text: `${t('gems.creditMiss')} ${t('toast.tapRetry')}`,
    ms: 8000,
    onPress: () => {
      restoreGemPurchases()
        .then((out) => {
          if (out.miss) creditMissToast()
          else if (out.gems > 0) showToast({ id: 'gems-credit-done', kind: 'done', text: t('gems.restored', { n: out.gems }), ms: 4200 })
        })
        .catch(() => creditMissToast())
    },
  })
}

// Server-side gems not yet on this phone land on the shelf.
async function claimAndCredit() {
  const claimed = await claimGemPurchases()
  if (claimed.gems > 0) {
    const shelf = writeShelf(addGemsShelf(readShelf(), claimed.gems))
    try {
      global.window?.dispatchEvent?.({ type: SHELF_IN, detail: shelf })
    } catch {
      // ok
    }
  }
  return claimed
}

// Restore: credit any paid pack the store still holds open, then claim what
// the server has. Gem packs are used up when credited, so most restores find
// nothing. Returns the gems added, or a miss.
export async function restoreGemPurchases() {
  if (!iapPossible()) return { gems: 0, miss: 'app' }
  if (!(await readUser())) return { gems: 0, miss: 'signin' }
  const mod = await loadIap()
  if (!mod) return { gems: 0, miss: 'setup' }
  if (!linked) await initGemIap()
  if (!linked) return { gems: 0, miss: 'setup' }
  const api = iapApi(mod)
  let gems = 0
  let failed = 0
  try {
    const open = (await api.getAvailablePurchases?.()) || []
    for (const purchase of open) {
      const id = String(purchase?.productId || purchase?.id || '')
      if (!GEM_PACKS.some((row) => row.storeId === id)) continue
      // One bad purchase must not stop the rest from being credited.
      try {
        const out = await creditPurchase(purchase)
        gems += out.gems || 0
      } catch {
        // The next restore or connect tries it again.
        failed += 1
      }
    }
  } catch (error) {
    return { gems, miss: 'store', code: String(error?.code || error?.message || '').slice(0, 120) }
  }
  const claimed = await claimAndCredit()
  if (claimed.miss && !gems) return { gems: 0, miss: claimed.miss }
  if (failed && !gems && !claimed.gems) return { gems: 0, miss: 'store' }
  return { gems: gems + claimed.gems, miss: '' }
}

// A buy that was paid but never credited (no signal, app closed) stays unfinished
// with the store. Credit it on the next connect; the server ignores repeats.
async function retryUnfinished(api) {
  if (!api?.getAvailablePurchases || !(await readUser())) return
  try {
    const open = await api.getAvailablePurchases()
    for (const purchase of open || []) {
      const id = String(purchase?.productId || purchase?.id || '')
      if (!GEM_PACKS.some((row) => row.storeId === id)) continue
      try {
        await creditPurchase(purchase)
      } catch {
        // Keep going; this one is tried again next connect.
      }
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
      let out
      try {
        out = await creditPurchase(purchase)
      } catch {
        out = { miss: 'credit' }
      }
      // Paid but not credited: say so, with a tap that tries again. The store
      // keeps the buy open, so the next connect retries too.
      if (out?.miss === 'test') testBuyToast()
      else if (out?.miss && out.miss !== 'other') creditMissToast()
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
  // Tie the buy to this account, so another account on the phone never
  // gets its gems. Apple wants a UUID; Supabase user ids are one.
  const userId = (await readUser())?.id || null
  const ask = () =>
    api.requestPurchase({
      request: {
        apple: { sku, appAccountToken: userId },
        google: { skus: [sku], obfuscatedAccountId: userId },
      },
      type: 'in-app',
    })
  // How many products Play hands back for this one pack right now.
  const countOne = async () => {
    try {
      const result = await api.fetchProducts({ skus: [sku], type: 'in-app' })
      const list = Array.isArray(result) ? result : result?.products || result?.value || []
      return String(list.length)
    } catch (error) {
      return `x ${error?.code || ''}`.trim()
    }
  }
  let before = ''
  let fresh = ''
  try {
    try {
      if (Platform.OS === 'android') before = await countOne()
      await ask()
    } catch (error) {
      // Play answered the buy's own lookup with nothing though the same pack
      // loaded at start. A stale billing connection does that; reconnect once.
      // Anything else (a decline, a pending card) is not retried.
      const empty = error?.isEmptyProductList || /failed to query product/i.test(String(error?.message || ''))
      if (Platform.OS !== 'android' || !empty || error?.code === api.ErrorCode?.UserCancelled) throw error
      try {
        await api.endConnection?.()
      } catch {
        // Already closed.
      }
      linked = false
      settled = ''
      await initGemIap()
      fresh = await countOne()
      await ask()
    }
    return { miss: '' }
  } catch (error) {
    if (error?.code === api.ErrorCode?.UserCancelled) return { miss: 'cancel' }
    console.warn('gem iap buy', error?.code, error?.message || error)
    // Play's reason rides in debugMessage and subResponseCodeAndroid, not in
    // the message, which is only "Failed to query product".
    const why = [
      error?.responseCode != null ? `play ${error.responseCode}` : '',
      error?.isEmptyProductList ? 'empty list' : '',
      error?.productType,
      error?.debugMessage,
      error?.subResponseCodeAndroid,
      error?.productId || error?.productIds,
      before ? `one ${before}` : '',
      fresh ? `fresh ${fresh}` : '',
      sku,
    ]
      .flat()
      .filter((part) => part != null && part !== '')
      .join(' · ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300)
    return { miss: 'store', code: [error?.code, why || error?.message].filter(Boolean).join(': ') }
  }
}
