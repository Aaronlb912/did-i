import { readShelf, writeShelf } from '../../src/lib/board-shelf.js'
import { SHELF_IN } from '../../src/lib/cloud-sync.js'
import { addBonusPending, dropBonusPending, readBonusPending } from '../../src/lib/streak-milestones.js'
import { applyGemBalanceToShelf, claimStreakBonus } from '../../src/lib/wallet.js'

// Gems paid for a streak milestone, 0 when none. A claim that does not go
// through waits for the next open.
export async function payStreakBonus(days, streak) {
  const res = await claimStreakBonus(days, streak).catch(() => null)
  if (!res) {
    addBonusPending(days)
    return 0
  }
  dropBonusPending(days)
  if (res.paid > 0) {
    const shelf = writeShelf(applyGemBalanceToShelf(readShelf(), res.balance))
    try {
      global.window?.dispatchEvent?.({ type: SHELF_IN, detail: shelf })
    } catch {
      // ok
    }
  }
  return res.paid
}

export function retryStreakBonus() {
  for (const days of readBonusPending()) payStreakBonus(days, null)
}
