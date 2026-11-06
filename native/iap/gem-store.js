import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { GEM_PACKS, gemPack } from '../../src/lib/gem-packs.js'
import { readShelf, writeShelf } from '../../src/lib/board-shelf.js'
import { claimGemPurchases } from '../../src/lib/gem-claim.js'
import { SHELF_IN } from '../../src/lib/cloud-sync.js'
import { readUser } from '../../src/lib/account.js'
import { submitGemPurchase } from '../../src/lib/gem-verify.js'
import { addGemsShelf } from '../../src/lib/purse.js'
import { applyGemBalanceToShelf, readGemBalance } from '../../src/lib/wallet.js'
import { t } from '../../src/lib/i18n.js'
import { showToast } from '../lib/toast-queue.js'

let connected = false
let linked = false
// One store connection per app run. Everyone who asks shares it. Only a good
// answer is kept: an empty or failed one (offline at start) asks again.
let pending = null
let settled = ''
// Apple's Ask to Buy or bank check: the buy waits on someone else. Apple lets
// a request sit for a day, so the wait ends then. Not saved across runs.
let approvalUntil = 0
let toldOther = false
// The last time the person tapped Buy or Restore. A pack from another account
// is only worth a toast then, not on every cold start.
let actedAt = 0
const ACT_WINDOW = 2 * 60 * 1000
const missListeners = new Set()
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

// Ask to Buy was declined or is over: the person can buy again.
export function clearApproval() {
  approvalUntil = 0
}

// A buy is waiting on an Ask to Buy or a bank check. No second buy meanwhile.
export function gemApprovalWaiting() {
  return Date.now() < approvalUntil
}

// The Get gems page listens, so a waiting banner ends when a credit misses.
export function onGemMiss(fn) {
  missListeners.add(fn)
  return () => missListeners.delete(fn)
}

function tellMiss(miss) {
  for (const fn of missListeners) {
    try {
      fn(miss)
    } catch {
      // A listener must not break the buy.
    }
  }
}

// A pack on this phone belongs to another account. Said once per run: the
// store hands it over again on every connect.
function otherAccountToast() {
  if (toldOther || Date.now() - actedAt > ACT_WINDOW) return
  toldOther = true
  showToast({ id: 'gems-other', kind: 'error', text: t('gems.otherAccount'), ms: 8000 })
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
  // Signed out: gem-iap would refuse it with no word shown. The buy stays open.
  if (!(await readUser())) return { miss: 'signin' }
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

// Paid, but the book is near 999,999: the server keeps the pack until there is room.
function gemsWaitToast() {
  showToast({ id: 'gems-waiting', kind: 'done', text: t('gems.waiting'), ms: 6000 })
}

// Ask to Buy or a bank check: not a failure. The pack is credited when the
// store reports it done.
function waitForApproval() {
  approvalUntil = Date.now() + 24 * 60 * 60 * 1000
  showToast({ id: 'gems-approval', kind: 'done', text: t('gems.approval'), ms: 6000 })
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
          if (out.miss === 'other') showToast({ id: 'gems-other', kind: 'error', text: t('gems.otherAccount'), ms: 8000 })
          else if (out.miss) creditMissToast()
          else if (out.gems > 0) showToast({ id: 'gems-credit-done', kind: 'done', text: t('gems.restored', { n: out.gems }), ms: 4200 })
          else showToast({ id: 'gems-credit-done', kind: 'done', text: t('gems.restoreNone'), ms: 4200 })
        })
        .catch(() => creditMissToast())
    },
  })
}

// Server-side gems not yet on this phone land on the shelf.
async function claimAndCredit() {
  const claimed = await claimGemPurchases()
  // Refresh even when nothing new was claimed: an earlier claim may have
  // landed on the server while this phone missed the reply.
  {
    // The server's balance, not ours plus the pack: a sync may already have
    // landed it, and adding again shows gems the account does not have.
    const balance = await readGemBalance().catch(() => null)
    const shelf = writeShelf(
      balance === null ? addGemsShelf(readShelf(), claimed.gems) : applyGemBalanceToShelf(readShelf(), balance),
    )
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
  actedAt = Date.now()
  if (!iapPossible()) return { gems: 0, miss: 'app' }
  if (!(await readUser())) return { gems: 0, miss: 'signin' }
  const mod = await loadIap()
  if (!mod) return { gems: 0, miss: 'setup' }
  if (!linked) await initGemIap()
  if (!linked) return { gems: 0, miss: 'setup' }
  const api = iapApi(mod)
  let gems = 0
  let failed = 0
  let pending = 0
  let other = 0
  try {
    const open = (await api.getAvailablePurchases?.()) || []
    for (const purchase of open) {
      const id = String(purchase?.productId || purchase?.id || '')
      if (!GEM_PACKS.some((row) => row.storeId === id)) continue
      // One bad purchase must not stop the rest from being credited.
      try {
        const out = await creditPurchase(purchase)
        gems += out.gems || 0
        // Paid but not credited (receipt, pending, credit): not "nothing to restore".
        if (out.miss === 'pending') pending += 1
        else if (out.miss === 'other') other += 1
        else if (out.miss && !['test', 'refunded'].includes(out.miss)) failed += 1
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
  // A card still clearing is not a failed restore.
  if (pending && !gems && !claimed.gems) return { gems: 0, miss: 'pending' }
  // A pack here was paid on another account: say so, not "nothing new".
  if (other && !gems && !claimed.gems) return { gems: 0, miss: 'other' }
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
  if (settled === 'ok') return Promise.resolve(settled)
  if (!pending) {
    // Already connected but no prices (offline at start): ask for prices
    // again, do not connect twice.
    pending = (linked ? refreshStore() : connectStore()).then((out) => {
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

async function refreshStore() {
  try {
    const api = iapApi(await loadIap())
    await loadProducts(api.fetchProducts)
    if (!liveSku.size) return 'empty'
    retryUnfinished(api)
    return 'ok'
  } catch (error) {
    console.warn('gem iap refresh', error?.message || error)
    return 'empty'
  }
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
      if (out?.miss !== 'pending') approvalUntil = 0
      if (out?.miss) tellMiss(out.miss)
      if (out?.miss === 'test') testBuyToast()
      else if (out?.miss === 'pending') showToast({ id: 'gems-pending', kind: 'done', text: t('gems.pending'), ms: 4200 })
      else if (out?.miss === 'signin') showToast({ id: 'gems-signin', kind: 'done', text: t('gems.needSignIn'), ms: 4200 })
      else if (out?.miss === 'other') otherAccountToast()
      else if (out?.miss) creditMissToast()
      else if (!out?.miss && !out?.gems && (readShelf()?.boards?.[0]?.gems || 0) > 999899) gemsWaitToast()
    })
    errorSub = purchaseErrorListener((error) => {
      if (error?.code === ErrorCode.UserCancelled) return
      if (error?.code === ErrorCode.DeferredPayment) return waitForApproval()
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
  actedAt = Date.now()
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
    // Not a failure: no Try again, the page says it is waiting.
    if (error?.code === api.ErrorCode?.DeferredPayment) {
      approvalUntil = Date.now() + 24 * 60 * 60 * 1000
      return { miss: '', approval: true }
    }
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
