import { accountSessionOn } from './session-id.js'
import { buyCheerStage, buyLook, LOOKS, normalizePurse } from './purse.js'
import { applyPurchaseToBook, purchaseWithCoins } from './wallet.js'

export async function buyLookWithCoins(book, id) {
  const look = LOOKS.find((item) => item.id === id)
  if (!look) return { book, miss: 'shop.miss.lookGone' }
  const purse = normalizePurse(book)
  if (purse.looks.includes(id)) {
    return { book: { ...book, ...purse, lookOn: id }, miss: '' }
  }
  if (look.gems > 0) return buyLook(book, id)
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
