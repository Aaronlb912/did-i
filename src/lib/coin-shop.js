import { accountSessionOn } from './session-id.js'
import { buyAccessory, buyBuddy, buyCheer, buyCheerStage, buyLook, liveCheers, liveLooks, nextCheerStage, shopBuddies, normalizePurse, wearAccessory } from './purse.js'
import { accessoryById } from './accessories.js'
import { applyGemOwnedToBook, applyPurchaseToBook, purchaseWithCoins, purchaseWithGems } from './wallet.js'
import { buyFrameLocal, frameById, frameForSale } from './frames.js'
import { noteMilestone } from './milestones.js'

// Signed out, a gem item would live on this phone only and be replaced by
// the account's list at sign in, so gem buys ask to sign in first.
export const SIGN_IN_MISS = 'shop.miss.signInGems'

// Signed in, the server takes the coins or gems and keeps the frame, so it
// cannot be added by editing the phone's saved data. Buying one puts it on.
async function buyFrameRaw(book, id) {
  const frame = frameById(id)
  const purse = normalizePurse(book)
  if (!frame || !frameForSale(id)) return { book, miss: 'frames.miss.notSold' }
  if (purse.frames.includes(id)) return { book: { ...book, ...purse, frame: id }, miss: '' }
  if (!accountSessionOn()) return frame.gems ? { book, miss: SIGN_IN_MISS } : buyFrameLocal({ ...book, ...purse }, id)
  if (frame.coins && purse.coins < frame.coins) return { book, miss: 'shop.miss.needCoins', missN: frame.coins }
  if (frame.gems && purse.gems < frame.gems) return { book, miss: 'shop.miss.needGems', missN: frame.gems }
  if (frame.gems) {
    const remote = await purchaseWithGems('frame', id)
    if (remote.miss) return { book, miss: remote.miss, missN: frame.gems }
    return { book: applyGemOwnedToBook(book, remote.owned, { frameOn: id }), miss: '' }
  }
  const remote = await purchaseWithCoins('frame', id)
  if (remote.miss) return { book, miss: remote.miss, missN: remote.missN }
  return { book: applyPurchaseToBook(book, remote, { frameOn: id }), miss: '' }
}

async function buyLookWithCoinsRaw(book, id) {
  const look = liveLooks().find((item) => item.id === id)
  if (!look) return { book, miss: 'shop.miss.lookGone' }
  const purse = normalizePurse(book)
  if (purse.looks.includes(id)) {
    return { book: { ...book, ...purse, lookOn: id }, miss: '' }
  }
  if (look.gems > 0) return buyWithGems(book, 'look', id)
  if (!look.coins) return buyLook(book, id)
  if (accountSessionOn()) {
    const remote = await purchaseWithCoins('look', id)
    if (remote.miss) return { book, miss: remote.miss, missN: remote.missN }
    return { book: applyPurchaseToBook(book, remote, { lookOn: id }), miss: '' }
  }
  return buyLook(book, id)
}

async function buyCheerStageWithCoinsRaw(book, id) {
  if (accountSessionOn()) {
    const shown = nextCheerStage(normalizePurse(book).cheerStages[id] || 1)
    const remote = await purchaseWithCoins('cheer_stage', id)
    if (remote.miss) return { book, miss: remote.miss, missN: remote.missN }
    // The server counts bought stages; the phone also counts uses. Keep the stage that was paid for.
    const next = applyPurchaseToBook(book, remote)
    const stage = Math.max(Number(next.cheerStages?.[id]) || 1, shown)
    return { book: { ...next, cheerStages: { ...next.cheerStages, [id]: stage } }, miss: '' }
  }
  return buyCheerStage(book, id)
}

// Signed in, the server takes the coins and keeps the accessory. Buying one
// puts it on; tapping one you own puts it on or takes it off.
async function buyAccessoryWithCoinsRaw(book, id) {
  const item = accessoryById(id)
  if (!item) return { book, miss: 'shop.miss.accessoryGone' }
  const purse = normalizePurse(book)
  if (purse.accessories.includes(id)) return wearAccessory(book, id)
  if (accountSessionOn()) {
    if (purse.coins < item.coins) return { book, miss: 'shop.miss.needCoins', missN: item.coins }
    const remote = await purchaseWithCoins('accessory', id)
    if (remote.miss) return { book, miss: remote.miss, missN: remote.missN }
    return { book: applyPurchaseToBook(book, remote, { wear: id }), miss: '' }
  }
  return buyAccessory(book, id)
}

const GEM_KINDS = {
  look: { list: liveLooks, owned: 'looks', on: 'lookOn', local: buyLook },
  cheer: { list: liveCheers, owned: 'cheers', on: 'cheerOn', local: buyCheer },
  buddy: { list: shopBuddies, owned: 'buddies', on: 'buddyOn', local: buyBuddy },
}

// Signed in, the server takes the gems and records the item, so it cannot be
// added by editing the phone's saved data. Signed out, it asks to sign in.
async function buyWithGemsRaw(book, kind, id) {
  const how = GEM_KINDS[kind]
  const item = how?.list().find((row) => row.id === id)
  const purse = normalizePurse(book)
  if (!how) return { book, miss: 'shop.miss.buyFail' }
  if (!item || purse[how.owned].includes(id)) return how.local(book, id)
  if (!accountSessionOn()) return item.gems > 0 ? { book, miss: SIGN_IN_MISS } : how.local(book, id)
  if (purse.gems < item.gems) return { book, miss: 'shop.miss.needGems', missN: item.gems }
  const remote = await purchaseWithGems(kind, id)
  if (remote.miss) return { book, miss: remote.miss, missN: item.gems }
  return { book: applyGemOwnedToBook(book, remote.owned, { [how.on]: id }), miss: '' }
}

// A buy counts as a milestone only when coins or gems actually went down,
// so wearing something you already own does not.
function counted(buy) {
  return async (book, ...rest) => {
    const before = normalizePurse(book)
    let out
    try {
      out = await buy(book, ...rest)
    } catch {
      // A dropped connection or a thrown call: the shop says the buy failed,
      // never a tap that does nothing. Nothing was spent on this phone.
      return { book, miss: 'shop.miss.buyFail' }
    }
    const after = out?.book ? normalizePurse(out.book) : before
    if (!out?.miss && (after.coins < before.coins || after.gems < before.gems)) noteMilestone('bought')
    return out
  }
}

export const buyFrame = counted(buyFrameRaw)
export const buyLookWithCoins = counted(buyLookWithCoinsRaw)
export const buyCheerStageWithCoins = counted(buyCheerStageWithCoinsRaw)
export const buyAccessoryWithCoins = counted(buyAccessoryWithCoinsRaw)
export const buyWithGems = counted(buyWithGemsRaw)
