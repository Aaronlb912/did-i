import { cloud, cloudSetUp } from './cloud.js'
import { readUser } from './account.js'
import { accountSessionOn } from './session-id.js'
import { CHEER_STAGE_COIN, isGemLook, LOOK_COIN_PRICE, LOOKS, normalizePurse } from './purse.js'

export function applyGemBalanceToShelf(shelf, balance) {
  const gems = Math.max(0, Math.min(9999, Math.floor(Number(balance) || 0)))
  if (!shelf?.boards?.length) return shelf
  const boards = shelf.boards.map((book) => ({ ...book, gems }))
  return { ...shelf, boards }
}

export function applyCoinBalanceToShelf(shelf, balance) {
  const coins = Math.max(0, Math.min(9999, Math.floor(Number(balance) || 0)))
  if (!shelf?.boards?.length) return shelf
  const boards = shelf.boards.map((book) => ({ ...book, coins }))
  return { ...shelf, boards }
}

function asIdList(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((id) => String(id)).filter(Boolean)
}

function asStageMap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out = {}
  for (const [key, val] of Object.entries(raw)) {
    const n = Math.min(5, Math.max(1, Math.floor(Number(val) || 0)))
    if (n > 0) out[String(key)] = n
  }
  return out
}

export function normalizeCoinCatalog(raw) {
  const bag = raw && typeof raw === 'object' ? raw : {}
  const catalog = bag.catalog && typeof bag.catalog === 'object' ? bag.catalog : bag
  return {
    coins: Math.max(0, Math.floor(Number(bag.coins ?? catalog.coins) || 0)),
    looks: asIdList(catalog.looks),
    cheerStages: asStageMap(catalog.cheer_stages || catalog.cheerStages),
  }
}

export function applyCoinCatalogToShelf(shelf, payload) {
  if (!shelf?.boards?.length) return shelf
  const cat = normalizeCoinCatalog(payload)
  const withCoins = applyCoinBalanceToShelf(shelf, cat.coins)
  const boards = withCoins.boards.map((book) => applyCoinCatalogToBook(book, cat))
  return { ...withCoins, boards }
}

export function applyCoinCatalogToBook(book, cat, opts = {}) {
  const purse = normalizePurse(book)
  const catalog = cat && typeof cat === 'object' ? cat : normalizeCoinCatalog(cat)
  const coins = catalog.coins || purse.coins
  const gemLooks = purse.looks.filter((id) => id === 'lime' || isGemLook(id))
  const looks = [...new Set(['lime', ...gemLooks, ...catalog.looks])]
  const cheerStages = { ...purse.cheerStages }
  for (const [id, stage] of Object.entries(catalog.cheerStages)) {
    cheerStages[id] = Math.max(cheerStages[id] || 1, stage)
  }
  return {
    ...book,
    ...purse,
    coins,
    looks,
    cheerStages,
    lookOn: opts.lookOn || purse.lookOn,
  }
}

export async function readGemBalance() {
  const db = cloud()
  if (!db) return null
  const user = await readUser()
  if (!user) return null
  const { data, error } = await db.rpc('read_gem_balance')
  if (error) {
    if (error.code === 'PGRST202' || /read_gem_balance/i.test(error.message || '')) return null
    return null
  }
  return Math.max(0, Math.floor(Number(data) || 0))
}

export async function readCoinBalance() {
  const db = cloud()
  if (!db) return null
  const user = await readUser()
  if (!user) return null
  const { data, error } = await db.rpc('read_coin_balance')
  if (error) {
    if (error.code === 'PGRST202' || /read_coin_balance/i.test(error.message || '')) return null
    return null
  }
  return Math.max(0, Math.floor(Number(data) || 0))
}

export async function readCoinCatalog() {
  const db = cloud()
  if (!db) return null
  const user = await readUser()
  if (!user) return null
  const { data, error } = await db.rpc('read_coin_catalog')
  if (error) {
    if (error.code === 'PGRST202' || /read_coin_catalog/i.test(error.message || '')) {
      const legacy = await db.rpc('read_coin_cosmetics')
      if (legacy.error) return null
      const bal = await readCoinBalance()
      return normalizeCoinCatalog({ coins: bal ?? 0, catalog: legacy.data })
    }
    return null
  }
  return normalizeCoinCatalog(data)
}

export async function grantWeeklyGem(weekKey) {
  if (!cloudSetUp()) return null
  const db = cloud()
  if (!db) return null
  const user = await readUser()
  if (!user) return null
  const key = String(weekKey || '').trim()
  if (!key) return null
  const { data, error } = await db.rpc('grant_weekly_gem', { week_key: key })
  if (error) {
    if (error.code === 'PGRST202' || /grant_weekly_gem/i.test(error.message || '')) return null
    return null
  }
  return Math.max(0, Math.floor(Number(data) || 0))
}

export async function creditNightCoins(nightIso, addCoins) {
  if (!accountSessionOn()) return null
  const db = cloud()
  if (!db) return null
  const user = await readUser()
  if (!user) return null
  const iso = String(nightIso || '').trim()
  const add = Math.max(0, Math.floor(Number(addCoins) || 0))
  if (!iso || add < 1) return null
  const { data, error } = await db.rpc('credit_night_coins', {
    night_iso: iso,
    add_coins: add,
  })
  if (error) {
    if (error.code === 'PGRST202' || /credit_night_coins/i.test(error.message || '')) return null
    return null
  }
  return Math.max(0, Math.floor(Number(data) || 0))
}

const COIN_LOOK_IDS = new Set(LOOKS.filter((item) => item.coins > 0).map((item) => item.id))

function coinCostFor(kind, itemId) {
  if (kind === 'look') return LOOK_COIN_PRICE
  if (kind === 'cheer_stage') return CHEER_STAGE_COIN
  return 0
}

function validateCoinItem(kind, itemId) {
  const id = String(itemId || '')
  if (kind === 'look' && !COIN_LOOK_IDS.has(id)) return false
  if (kind === 'cheer_stage') return Boolean(id)
  return false
}

export async function purchaseWithCoins(kind, itemId) {
  if (!accountSessionOn()) return { miss: 'off' }
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await readUser()
  if (!user) return { miss: 'out' }
  const k = String(kind || '').trim()
  const id = String(itemId || '').trim()
  if (!validateCoinItem(k, id)) {
    if (k === 'look') return { miss: 'shop.miss.lookGone' }
    return { miss: 'shop.miss.cheerGone' }
  }
  const { data, error } = await db.rpc('buy_with_coins', { p_kind: k, p_item_id: id })
  if (error) {
    const cost = coinCostFor(k, id)
    if (/need coins/i.test(error.message || '')) return { miss: 'shop.miss.needCoins', missN: cost }
    return { miss: 'shop.miss.needCoins', missN: cost }
  }
  const cat = normalizeCoinCatalog(data)
  return { miss: '', ...cat, catalog: cat }
}

/** @deprecated use purchaseWithCoins */
export async function buyCoinCosmetic(kind, itemId) {
  const out = await purchaseWithCoins(kind, itemId)
  if (out.miss) return out
  return {
    miss: '',
    coins: out.coins,
  }
}

export function applyPurchaseToBook(book, purchase, opts = {}) {
  const cat = normalizeCoinCatalog(purchase?.catalog ? { coins: purchase.coins, ...purchase.catalog } : purchase)
  return applyCoinCatalogToBook(book, cat, opts)
}

/** @deprecated */
export function applyCosmeticBuyToBook(book, remote, opts = {}) {
  return applyPurchaseToBook(
    book,
    {
      coins: remote?.coins,
    },
    opts,
  )
}

/** @deprecated */
export function applyCoinCosmeticsToShelf(shelf, payload) {
  return applyCoinCatalogToShelf(shelf, { catalog: payload })
}
