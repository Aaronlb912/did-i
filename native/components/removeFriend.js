import { readShelf, writeShelf } from '../../src/lib/board-shelf.js'
import { t, tMiss } from '../../src/lib/i18n.js'
import { dropFriend, personName, weLeaveShared, weSharedCount } from '../../src/lib/people.js'
import { refreshWeNights } from '../../src/lib/we-nights.js'
import { pushShelfAfterWidgetAnswer } from '../../src/lib/widget-cloud-sync.js'
import { publishShelf } from '../../src/lib/widget-tonight.js'
import { publishSheet } from './SheetHost.jsx'

// Did yous you kept from them stay on your tonight; only "from {name}" goes.
function forgetSender(name) {
  if (!name) return
  const shelf = readShelf()
  let changed = false
  const boards = (shelf.boards || []).map((book) => {
    let touched = false
    const lamps = (book.lamps || []).map((lamp) => {
      if (!lamp.fromDidYou || lamp.fromName !== name) return lamp
      touched = true
      // The server stops their view already; the "sees your answers" line goes too.
      const { fromName, sendId, shareOff, ...rest } = lamp
      return rest
    })
    if (!touched) return book
    changed = true
    return { ...book, lamps }
  })
  if (!changed) return
  const next = writeShelf({ ...shelf, boards })
  publishShelf(next)
  pushShelfAfterWidgetAnswer(next, { now: true }).catch(() => {})
}

// The one remove-a-friend sheet, from the friends list and the friend page.
// Did yous waiting between you are dropped on the server; Did we's you
// share can be left in the same tap.
export async function askRemoveFriend({ person, colors, onDone, onMiss }) {
  const name = personName(person) || t('people.someone')
  const other = person?.user_id
  if (!other) return
  const shared = await weSharedCount(other)
  const go = async (leave) => {
    publishSheet(null)
    const { miss } = await dropFriend(other)
    if (miss) return onMiss?.(tMiss(miss))
    if (leave) {
      const out = await weLeaveShared(other)
      refreshWeNights().catch(() => {})
      if (out.miss) {
        forgetSender(personName(person))
        return onDone?.(t('confirm.droppedWeMiss', { name }))
      }
    }
    forgetSender(personName(person))
    return onDone?.(t('people.dropped', { name }))
  }
  publishSheet({
    title: t('people.dropTitle', { name }),
    body: shared === null ? t('people.dropBody') : shared === 1 ? t('people.dropBodyWeOne', { name }) : shared ? t('people.dropBodyWe', { n: shared, name }) : t('people.dropBody'),
    goLabel: shared === null ? t('people.dropLeaveAny') : shared === 1 ? t('people.dropLeaveOne') : shared ? t('people.dropLeave', { n: shared }) : t('people.drop'),
    ...(shared !== 0 ? { moreLabel: t('people.dropOnly'), onMore: () => go(false) } : {}),
    closeLabel: t('settings.neverMind'),
    colors,
    onClose: () => publishSheet(null),
    onGo: () => go(shared !== 0),
  })
}
