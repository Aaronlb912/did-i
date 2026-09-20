import {
  ErrorCode,
  fetchProducts,
  finishTransaction,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
} from 'expo-iap'
import { Platform } from 'react-native'
import { ALL_STORE_IDS, gemPack } from '../../src/lib/gem-packs.js'
import { readShelf, writeShelf } from '../../src/lib/board-shelf.js'
import { claimGemPurchases } from '../../src/lib/gem-claim.js'
import { SHELF_IN } from '../../src/lib/cloud-sync.js'
import { submitGemPurchase } from '../../src/lib/gem-verify.js'
import { addGemsShelf } from '../../src/lib/purse.js'

let connected = false
let starting = false
const prices = new Map()
let purchaseSub = null
let errorSub = null

export function iapPossible() {
  return Platform.OS === 'android' || Platform.OS === 'ios'
}

export function iapReady() {
  return connected && prices.size > 0
}

export function storePrice(packId) {
  const pack = gemPack(packId)
  if (!pack) return ''
  return prices.get(pack.storeId) || ''
}

async function creditPurchase(purchase) {
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
  try {
    await finishTransaction({ purchase, isConsumable: true })
  } catch {
    // Already finished or store will retry.
  }
  return out
}

export async function initGemIap() {
  if (!iapPossible() || connected || starting) return connected ? 'ok' : 'skip'
  starting = true
  try {
    await initConnection()
    purchaseSub?.remove()
    errorSub?.remove()
    purchaseSub = purchaseUpdatedListener(async (purchase) => {
      await creditPurchase(purchase)
    })
    errorSub = purchaseErrorListener((error) => {
      if (error?.code === ErrorCode.UserCancelled) return
      console.warn('gem iap', error?.message || error)
    })
    const result = await fetchProducts({ skus: ALL_STORE_IDS, type: 'in-app' })
    const list = Array.isArray(result) ? result : result?.products || []
    prices.clear()
    for (const item of list) {
      const id = String(item?.id || item?.productId || '')
      const label = String(item?.displayPrice || item?.localizedPrice || '')
      if (id && label) prices.set(id, label)
    }
    connected = true
    return prices.size ? 'ok' : 'empty'
  } catch (error) {
    console.warn('gem iap init', error?.message || error)
    return 'fail'
  } finally {
    starting = false
  }
}

export async function buyGemPack(packId) {
  const pack = gemPack(packId)
  if (!pack) return { miss: 'pack' }
  if (!iapPossible()) return { miss: 'app' }

  if (!connected) {
    const boot = await initGemIap()
    if (boot !== 'ok') return { miss: boot === 'empty' ? 'setup' : 'setup' }
  }

  const sku = pack.storeId
  try {
    await requestPurchase({
      request: {
        apple: { sku },
        google: { skus: [sku] },
      },
      type: 'in-app',
    })
    return { miss: '' }
  } catch (error) {
    if (error?.code === ErrorCode.UserCancelled) return { miss: 'cancel' }
    return { miss: 'store' }
  }
}
