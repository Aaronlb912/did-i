// The lines the "why" sheet shows for a night (nightWhy), phone and web.
import { shortLabel } from './board-json.js'
import { weCardShort } from './did-we.js'
import { t } from './i18n.js'

const list = (items) => items.join(', ')

// itemsShown: the sheet lists each question under the text, so the text names none.
export function nightWhyLines(why, { itemsShown = false } = {}) {
  const lines = [t(`why.${why.state}`)]
  if (itemsShown) return lines
  if (why.noped.length) lines.push(t('why.noped', { list: list(why.noped.map((row) => shortLabel(row.lamp))) }))
  if (why.unanswered.length) lines.push(t('why.unanswered', { list: list(why.unanswered.map((row) => shortLabel(row.lamp))) }))
  if (why.weOpen.length) lines.push(t('why.weOpen', { list: list(why.weOpen.map((id) => weCardShort(id) || t('we.title'))) }))
  return lines
}

export const COIN_RULES = ['coins.rDid', 'coins.rFirst', 'coins.rNew', 'coins.rDeadline', 'coins.rGem']
