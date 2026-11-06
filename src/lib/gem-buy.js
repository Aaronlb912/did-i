import { readUser } from './account.js'
import { isReactNative } from './env.js'
import { claimGemPurchases } from './gem-claim.js'
import { gemPack } from './gem-packs.js'
import { buyGemPack, iapReady, initGemIap, iapPossible, restoreGemPurchases } from './gem-iap.js'

export { claimGemPurchases, restoreGemPurchases }

export function gemCheckoutReady(_packId) {
  if (isReactNative()) return iapPossible()
  return false
}

export function anyGemCheckoutReady() {
  return gemCheckoutReady('gems_1')
}

export async function startGemPurchase(packId) {
  const pack = gemPack(packId)
  if (!pack) return { miss: 'pack' }

  const user = await readUser()
  if (!user) return { miss: 'signin' }

  if (!isReactNative()) return { miss: 'app' }

  if (!iapReady()) await initGemIap()

  const out = await buyGemPack(packId)
  if (out.miss === 'cancel') return { miss: '' }
  if (out.miss) return out
  // approval: an Ask to Buy or bank check, so the page says it is waiting for that.
  return { miss: '', pending: true, approval: Boolean(out.approval) }
}
