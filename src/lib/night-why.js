// The lines the "why" sheet shows for a night (nightWhy), phone and web.
import { shortLabel } from './board-json.js'
import { weCardShort } from './did-we.js'
import { t } from './i18n.js'
import { gentleOn } from './prefs.js'
import { nightOpen } from './recurrence.js'

const list = (items) => items.join(', ')

// itemsShown: the sheet lists each question under the text, so the text names none.
export function nightWhyLines(why, { itemsShown = false, now = new Date() } = {}) {
  // Gentle mode: a missed night gets no streak line, only what was left.
  const lines = why.state === 'missed' && gentleOn() ? [] : [t(`why.${why.state}`)]
  if (itemsShown) return lines
  // A skip on a night that is still open is a not yet, not a nope.
  const nopeKey = why.state === 'open' || nightOpen(why.iso, now) ? 'why.notYet' : 'why.noped'
  if (why.noped.length) lines.push(t(nopeKey, { list: list(why.noped.map((row) => shortLabel(row.lamp))) }))
  if (why.unanswered.length) lines.push(t('why.unanswered', { list: list(why.unanswered.map((row) => shortLabel(row.lamp))) }))
  if (why.weOpen.length) lines.push(t('why.weOpen', { list: list(why.weOpen.map((id) => weCardShort(id) || t('we.title'))) }))
  return lines
}

export const COIN_RULES = ['coins.rDid', 'coins.rFirst', 'coins.rDeadline', 'coins.rGem']
