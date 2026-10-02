import { accountSessionOn } from './session-id.js'
import { BUDDIES, buyAccessory, buyBuddy, buyCheer, buyCheerStage, buyLook, CHEERS, LOOKS, normalizePurse, wearAccessory } from './purse.js'
import { accessoryById } from './accessories.js'
import { applyGemOwnedToBook, applyPurchaseToBook, purchaseWithCoins, purchaseWithGems } from './wallet.js'

export async function buyLookWithCoins(book, id) {
  const look = LOOKS.find((item) => item.id === id)
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

export async function buyCheerStageWithCoins(book, id) {
  if (accountSessionOn()) {
    const remote = await purchaseWithCoins('cheer_stage', id)
    if (remote.miss) return { book, miss: remote.miss, missN: remote.missN }
    return { book: applyPurchaseToBook(book, remote), miss: '' }
  }
  return buyCheerStage(book, id)
}

// Signed in, the server takes the coins and keeps the accessory. Buying one
// puts it on; tapping one you own puts it on or takes it off.
export async function buyAccessoryWithCoins(book, id) {
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
  look: { list: LOOKS, owned: 'looks', on: 'lookOn', local: buyLook },
  cheer: { list: CHEERS, owned: 'cheers', on: 'cheerOn', local: buyCheer },
  buddy: { list: BUDDIES, owned: 'buddies', on: 'buddyOn', local: buyBuddy },
}

// Signed in, the server takes the gems and records the item, so it cannot be
// added by editing the phone's saved data. Signed out, it stays on this phone.
export async function buyWithGems(book, kind, id) {
  const how = GEM_KINDS[kind]
  const item = how?.list.find((row) => row.id === id)
  const purse = normalizePurse(book)
  if (!item || !accountSessionOn() || purse[how.owned].includes(id)) return how ? how.local(book, id) : { book, miss: 'shop.miss.buyFail' }
  if (purse.gems < item.gems) return { book, miss: 'shop.miss.needGems', missN: item.gems }
  const remote = await purchaseWithGems(kind, id)
  if (remote.miss) return { book, miss: remote.miss, missN: item.gems }
  return { book: applyGemOwnedToBook(book, remote.owned, { [how.on]: id }), miss: '' }
}
