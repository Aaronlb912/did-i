// One gem = $1. Bigger packs shave the per-gem price.
export const GEM_UNIT_CENTS = 100

const RAW = [
  { id: 'gems_1', gems: 1, cents: 100 },
  { id: 'gems_3', gems: 3, cents: 270 },
  { id: 'gems_5', gems: 5, cents: 425 },
  { id: 'gems_10', gems: 10, cents: 700 },
  { id: 'gems_25', gems: 25, cents: 1500 },
  { id: 'gems_50', gems: 50, cents: 3000 },
]

const BUNDLE = 'com.aaronbryant.didi'

export const GEM_PACKS = RAW.map((pack) => {
  const list = pack.gems * GEM_UNIT_CENTS
  const save = list > pack.cents ? Math.round(100 - (pack.cents / list) * 100) : 0
  const storeId = `${BUNDLE}.${pack.id}`
  return {
    ...pack,
    save,
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
