import { gemProductSku, PLAY_PACKAGE, STORE_APP_ID } from './store-skus.js'

// One gem = $1, every pack. Bigger packs add bonus gems on top instead of a
// lower price. Keep supabase/functions/gem-iap PACKS in step with this.
export const GEM_UNIT_CENTS = 100

export { APP_STORE_SKU, PLAY_PACKAGE, STORE_APP_ID } from './store-skus.js'

const RAW = [
  { id: 'gems_1', base: 1, bonus: 0 },
  { id: 'gems_3', base: 3, bonus: 0 },
  { id: 'gems_5', base: 5, bonus: 1 },
  { id: 'gems_10', base: 10, bonus: 4 },
  { id: 'gems_25', base: 25, bonus: 15 },
  { id: 'gems_50', base: 50, bonus: 30 },
]

export const GEM_PACKS = RAW.map((pack) => {
  const storeId = gemProductSku(pack.id)
  return {
    ...pack,
    gems: pack.base + pack.bonus,
    cents: pack.base * GEM_UNIT_CENTS,
    storeId,
    playId: storeId,
  }
})

export const ALL_STORE_IDS = GEM_PACKS.map((pack) => pack.storeId)

const PACK_BY_ID = new Map(GEM_PACKS.map((pack) => [pack.id, pack]))
const PACK_BY_STORE = new Map(GEM_PACKS.map((pack) => [pack.storeId, pack]))

export function gemPack(id) {
  return PACK_BY_ID.get(id) || null
}

export function gemPackByStoreId(storeId) {
  return PACK_BY_STORE.get(String(storeId || '')) || null
}

export function packPriceLabel(pack, storePrice = '') {
  if (storePrice) return storePrice
  return formatUsd(pack.cents)
}

export function formatUsd(cents) {
  const n = Math.max(0, Math.floor(Number(cents) || 0))
  if (n % 100 === 0) return `$${n / 100}`
  return `$${(n / 100).toFixed(2)}`
}
