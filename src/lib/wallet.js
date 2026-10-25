import { cloud, cloudSetUp } from './cloud.js'
import { readUser } from './account.js'
import { accountSessionOn } from './session-id.js'
import { CHEER_STAGE_COIN, FREE_BUDDY, freeEventItem, isFreeEventId, isGemLook, isReferBuddy, isLive, LOOK_COIN_PRICE, liveLooks, normalizePurse } from './purse.js'
import { accessoryById, accessoryOnSale } from './accessories.js'
import { addDaysIso, boardDate } from './recurrence.js'
import { frameById, withServerFrames } from './frames.js'

export function applyGemBalanceToShelf(shelf, balance) {
  const gems = Math.max(0, Math.min(999999, Math.floor(Number(balance) || 0)))
  if (!shelf?.boards?.length) return shelf
  const boards = shelf.boards.map((book) => ({ ...book, gems }))
  return { ...shelf, boards }
}

export function applyCoinBalanceToShelf(shelf, balance) {
  const coins = Math.max(0, Math.min(999999, Math.floor(Number(balance) || 0)))
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
    // A free event item claimed signed out stays; it costs nothing to keep.
    cheers: [...new Set(['lime', ...purse.cheers.filter((id) => isFreeEventId('cheer', id)), ...own.cheers])],
    // The referral buddy is not a gem item; it stays once claim_invites gave it.
    buddies: [...new Set([FREE_BUDDY, ...purse.buddies.filter((id) => isReferBuddy(id) || isFreeEventId('buddy', id)), ...own.buddies])],
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

// Bumped on every shop write. A sync that began before one must not apply its
// older balance or owned lists over the buy (cloud-sync.js).
let shopWrites = 0
export function shopWriteCount() {
  return shopWrites
}

export async function purchaseWithGems(kind, itemId) {
  const db = cloud()
  if (!db) return { miss: 'shop.miss.buyFail' }
  shopWrites += 1
  const { data, error } = await db.rpc('buy_with_gems', { p_kind: kind, p_item_id: itemId })
  shopWrites += 1
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

// Free event items (event_catalog): no gems move, the server records the item.
export async function claimFreeItem(kind, itemId) {
  const db = cloud()
  if (!db) return { miss: 'shop.miss.buyFail' }
  shopWrites += 1
  const { data, error } = await db.rpc('claim_free_item', { p_kind: kind, p_item_id: itemId })
  shopWrites += 1
  if (error) {
    if (/bad item/i.test(error.message || '')) return { miss: kind === 'buddy' ? 'shop.miss.buddyGone' : 'shop.miss.cheerGone' }
    return { miss: 'shop.miss.buyFail' }
  }
  return { miss: '', owned: normalizeGemOwned(data) }
}

// A free item claimed signed out lives on the phone only. Signed in, send it
// to the account once per session while the server still allows its window
// (a day of slack either way; the server decides). Returns the server's new
// owned list, or null when nothing was claimed. Failures are silent and the
// phone keeps its copy; a network or server error tries again next sync.
const freeCatchUp = new Set()
export async function catchUpFreeClaims(shelf, owned, today = boardDate(new Date())) {
  const own = normalizeGemOwned(owned)
  let latest = null
  for (const book of shelf?.boards || []) {
    const purse = normalizePurse(book)
    for (const [kind, list, have] of [['cheer', purse.cheers, own.cheers], ['buddy', purse.buddies, own.buddies]]) {
      for (const id of list) {
        const item = freeEventItem(kind, id)
        const key = kind + ':' + id
        if (!item || have.includes(id) || freeCatchUp.has(key)) continue
        if (!isLive(item, today) && !isLive(item, addDaysIso(today, -1)) && !isLive(item, addDaysIso(today, 1))) continue
        freeCatchUp.add(key)
        const out = await claimFreeItem(kind, id).catch(() => null)
        if (out && !out.miss) latest = out.owned
        else if (!out || out.miss === 'shop.miss.buyFail') freeCatchUp.delete(key)
      }
    }
  }
  return latest
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

// What a phone earned signed out, for the once-per-account carry. Gem looks
// and the free lime look are not coin items. null when there is nothing.
export function carryPayload(purse) {
  const p = normalizePurse(purse)
  const add_coins = Math.min(300, Math.max(0, Math.floor(Number(p.coins) || 0)))
  const looks = p.looks.filter((id) => id !== 'lime' && !isGemLook(id)).slice(0, 50)
  const accessories = p.accessories.slice(0, 50)
  if (!add_coins && !looks.length && !accessories.length) return null
  return { add_coins, looks, accessories }
}

export async function carrySignedOut(purse) {
  const payload = carryPayload(purse)
  if (!payload) return null
  const db = cloud()
  if (!db) return null
  const user = await readUser()
  if (!user) return null
  const { data, error } = await db.rpc('carry_signed_out', payload)
  if (error) return null
  return normalizeCoinCatalog(data)
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

function coinCostFor(kind, itemId) {
  if (kind === 'look') return LOOK_COIN_PRICE
  if (kind === 'cheer_stage') return CHEER_STAGE_COIN
  if (kind === 'accessory') return accessoryById(itemId)?.coins || 0
  if (kind === 'frame') return frameById(itemId)?.coins || 0
  return 0
}

export function validateCoinItem(kind, itemId, today = boardDate(new Date())) {
  const id = String(itemId || '')
  if (kind === 'look') return liveLooks().some((item) => item.coins > 0 && item.id === id)
  if (kind === 'cheer_stage') return Boolean(id)
  if (kind === 'accessory') return accessoryOnSale(accessoryById(id), today)
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
  shopWrites += 1
  const { data, error } = await db.rpc('buy_with_coins', { p_kind: k, p_item_id: id })
  shopWrites += 1
  if (error) {
    const text = error.message || ''
    if (/need coins/i.test(text)) return { miss: 'shop.miss.needCoins', missN: coinCostFor(k, id) }
    if (/bad item/i.test(text)) return { miss: gone }
    // The reply may be lost after the buy landed: read back, so the phone
    // shows the item owned and the coins spent instead of "buy failed".
    const list = { look: 'looks', accessory: 'accessories', frame: 'frames' }[k]
    const back = list ? await readCoinCatalog().catch(() => null) : null
    if (back?.[list]?.includes(id)) return { miss: '', ...back, catalog: back }
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

// A balance short enough for the header: 9999, then 12.3k, then 1.2M.
// Rounded down, so it never shows more than the person has.
export function shortCount(value) {
  const n = Math.max(0, Math.floor(Number(value) || 0))
  if (n < 10000) return String(n)
  const [size, mark] = n < 1000000 ? [1000, 'k'] : [1000000, 'M']
  const tenths = Math.floor((n * 10) / size) / 10
  return `${n / size >= 100 ? Math.floor(n / size) : tenths}${mark}`
}

// One-time coins for finishing a tour part (basics 20, more 30). Returns
// { paid, balance }: paid is 0 when already claimed. Null when it did not go
// through.
export async function claimTourCoins(part) {
  if (!accountSessionOn()) return null
  const db = cloud()
  if (!db) return null
  const { data, error } = await db.rpc('claim_tour_coins', { part })
  if (error) return null
  return {
    paid: Math.max(0, Math.floor(Number(data?.paid) || 0)),
    balance: Math.max(0, Math.floor(Number(data?.balance) || 0)),
  }
}
