import { cloud, cloudSetUp } from './cloud.js'
import { readUser } from './account.js'
import { accountSessionOn } from './session-id.js'
import { CHEER_STAGE_COIN, FREE_BUDDY, isGemLook, isReferBuddy, isLive, LOOK_COIN_PRICE, LOOKS, normalizePurse } from './purse.js'
import { accessoryById } from './accessories.js'
import { frameById, withServerFrames } from './frames.js'

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
    accessories: asIdList(catalog.accessories),
    frames: asIdList(catalog.frames),
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
  const coins = Number.isFinite(catalog.coins) ? catalog.coins : purse.coins
  const gemLooks = purse.looks.filter((id) => id === 'lime' || isGemLook(id))
  const looks = [...new Set(['lime', ...gemLooks, ...catalog.looks])]
  const cheerStages = { ...purse.cheerStages }
  for (const [id, stage] of Object.entries(catalog.cheerStages)) {
    cheerStages[id] = Math.max(cheerStages[id] || 1, stage)
  }
  // Signed in, the server's list is the whole list, like coin looks: an
  // accessory added by editing the phone's saved data does not stay.
  const accessories = [...new Set(catalog.accessories || [])]
  const slot = opts.wear ? accessoryById(opts.wear)?.slot : ''
  const kept = Object.fromEntries(Object.entries(purse.worn).filter(([, id]) => accessories.includes(id)))
  return {
    ...book,
    ...purse,
    coins,
    looks,
    cheerStages,
    accessories,
    worn: slot ? { ...kept, [slot]: opts.wear } : kept,
    // Coin frames come from the server list; earned, seasonal and gem ones stay.
    frames: withServerFrames(purse.frames, 'coin', catalog.frames || []),
    frame: opts.frameOn || purse.frame,
    buddyOn: slot ? purse.buddyOn || FREE_BUDDY : purse.buddyOn,
    lookOn: opts.lookOn || purse.lookOn,
  }
}

// Gem looks, cheers and buddies owned on the server (read_gem_owned,
// buy_with_gems). Free items (lime, the ant) and coin looks are not in it.
export function normalizeGemOwned(raw) {
  const bag = raw && typeof raw === 'object' ? raw : {}
  return {
    gems: Math.max(0, Math.floor(Number(bag.gems) || 0)),
    looks: asIdList(bag.looks),
    cheers: asIdList(bag.cheers),
    buddies: asIdList(bag.buddies),
    frames: asIdList(bag.frames),
  }
}

// The server list replaces the gem items on the phone; free items and coin
// looks stay as they are.
export function applyGemOwnedToBook(book, owned, opts = {}) {
  const purse = normalizePurse(book)
  const own = normalizeGemOwned(owned)
  return {
    ...book,
    ...purse,
    gems: own.gems,
    looks: [...new Set([...purse.looks.filter((id) => !isGemLook(id)), ...own.looks])],
    cheers: [...new Set(['lime', ...own.cheers])],
    // The referral buddy is not a gem item; it stays once claim_invites gave it.
    buddies: [...new Set([FREE_BUDDY, ...purse.buddies.filter(isReferBuddy), ...own.buddies])],
    frames: withServerFrames(purse.frames, 'gem', own.frames),
    frame: opts.frameOn || purse.frame,
    lookOn: opts.lookOn || purse.lookOn,
    cheerOn: opts.cheerOn || purse.cheerOn,
    buddyOn: opts.buddyOn || purse.buddyOn,
  }
}

export function applyGemOwnedToShelf(shelf, owned) {
  if (!shelf?.boards?.length) return shelf
  return { ...shelf, boards: shelf.boards.map((book) => applyGemOwnedToBook(book, owned)) }
}

export async function readGemOwned() {
  const db = cloud()
  if (!db) return null
  const user = await readUser()
  if (!user) return null
  const { data, error } = await db.rpc('read_gem_owned')
  if (error) return null
  return normalizeGemOwned(data)
}

export async function purchaseWithGems(kind, itemId) {
  const db = cloud()
  if (!db) return { miss: 'shop.miss.buyFail' }
  const { data, error } = await db.rpc('buy_with_gems', { p_kind: kind, p_item_id: itemId })
  if (error) {
    const text = error.message || ''
    if (/need gems/i.test(text)) return { miss: 'shop.miss.needGems' }
    if (/bad item/i.test(text)) {
      if (kind === 'look') return { miss: 'shop.miss.lookGone' }
      if (kind === 'frame') return { miss: 'frames.miss.notSold' }
      return { miss: kind === 'buddy' ? 'shop.miss.buddyGone' : 'shop.miss.cheerGone' }
    }
    return { miss: 'shop.miss.buyFail' }
  }
  return { miss: '', owned: normalizeGemOwned(data) }
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
  if (kind === 'accessory') return accessoryById(itemId)?.coins || 0
  if (kind === 'frame') return frameById(itemId)?.coins || 0
  return 0
}

export function validateCoinItem(kind, itemId) {
  const id = String(itemId || '')
  if (kind === 'look') return COIN_LOOK_IDS.has(id)
  if (kind === 'cheer_stage') return Boolean(id)
  if (kind === 'accessory') return Boolean(accessoryById(id) && isLive(accessoryById(id)))
  if (kind === 'frame') return frameById(id)?.kind === 'coin'
  return false
}

export async function purchaseWithCoins(kind, itemId) {
  if (!accountSessionOn()) return { miss: 'shop.miss.buyFail' }
  const db = cloud()
  if (!db) return { miss: 'shop.miss.buyFail' }
  const user = await readUser()
  if (!user) return { miss: 'shop.miss.buyFail' }
  const k = String(kind || '').trim()
  const id = String(itemId || '').trim()
  const gone = k === 'look' ? 'shop.miss.lookGone' : k === 'accessory' ? 'shop.miss.accessoryGone' : k === 'frame' ? 'frames.miss.notSold' : 'shop.miss.cheerGone'
  if (!validateCoinItem(k, id)) return { miss: gone }
  const { data, error } = await db.rpc('buy_with_coins', { p_kind: k, p_item_id: id })
  if (error) {
    const text = error.message || ''
    if (/need coins/i.test(text)) return { miss: 'shop.miss.needCoins', missN: coinCostFor(k, id) }
    if (/bad item/i.test(text)) return { miss: gone }
    return { miss: 'shop.miss.buyFail' }
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

// Signed in: { nights: [{ night, coins }], gemWeek } from the server, or null.
export async function readCoinHistory() {
  const db = cloud()
  if (!db) return null
  const user = await readUser()
  if (!user) return null
  const { data, error } = await db.rpc('read_coin_history')
  if (error || !data) return null
  const nights = (Array.isArray(data.nights) ? data.nights : [])
    .map((row) => ({ night: String(row.night || '').slice(0, 10), coins: Math.max(0, Math.floor(Number(row.coins) || 0)) }))
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.night))
  return { nights, gemWeek: String(data.gem_week || '') }
}
