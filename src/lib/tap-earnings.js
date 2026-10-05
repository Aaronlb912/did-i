import { accountSessionOn } from './session-id.js'
import { readShelf, writeShelf } from './board-shelf.js'
import { boardDate } from './recurrence.js'
import { takeEarnedCoins, weeklyGemBump } from './purse.js'
import { applyCoinBalanceToShelf, applyGemBalanceToShelf, creditNightCoins, grantWeeklyGem } from './wallet.js'

// A tap outside the app (the home screen widget) pays the same as one inside
// it: the week's gem on the first cleared night, and for an account the
// night's coins go to the server, which owns the balance (credit_night_coins).
// The app's own saves do this in useAppShelf; the widget path skipped it, so
// signed-in widget taps earned nothing and a week cleared there got no gem.
export function settleTapEarnings(before, after, clock = new Date(), onShelf) {
  if (!after?.boards?.length) return after
  // Signed in, not just a server configured: signed out, the gem lands on this phone.
  const account = accountSessionOn()
  const bumped = weeklyGemBump(after, before, clock, { accountSync: account })
  const shelf = bumped === after ? after : writeShelf(bumped)
  if (!account) return shelf
  const fold = shelf.boards.find((book) => book.id === shelf.currentId)?.dayFoldHour ?? 0
  const earned = takeEarnedCoins()
  if (earned > 0) {
    creditNightCoins(boardDate(clock, fold), earned)
      .then((balance) => {
        if (balance == null) return
        onShelf?.(writeShelf(applyCoinBalanceToShelf(readShelf(), balance)))
      })
      .catch(() => {})
  }
  if (shelf.gemWeek && shelf.gemWeek !== (before?.gemWeek || '')) {
    grantWeeklyGem(shelf.gemWeek)
      .then((balance) => {
        // Not granted (offline, signed out): forget the week so the next
        // cleared night asks again instead of the gem being lost.
        if (balance == null) {
          const now = readShelf()
          if (now.gemWeek === shelf.gemWeek) onShelf?.(writeShelf({ ...now, gemWeek: before?.gemWeek || '' }))
          return
        }
        onShelf?.(writeShelf(applyGemBalanceToShelf(readShelf(), balance)))
      })
      .catch(() => {})
  }
  return shelf
}
