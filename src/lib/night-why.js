// The lines the "why" sheet shows for a night (nightWhy), phone and web.
import { shortLabel } from './board-json.js'
import { weCardTitle } from './did-we.js'
import { t } from './i18n.js'

const list = (items) => items.join(', ')

export function nightWhyLines(why) {
  const lines = [t(`why.${why.state}`)]
  if (why.noped.length) lines.push(t('why.noped', { list: list(why.noped.map((row) => shortLabel(row.lamp))) }))
  if (why.unanswered.length) lines.push(t('why.unanswered', { list: list(why.unanswered.map((row) => shortLabel(row.lamp))) }))
  if (why.weOpen.length) lines.push(t('why.weOpen', { list: list(why.weOpen.map((id) => weCardTitle(id) || t('we.title'))) }))
  return lines
}

export const COIN_RULES = ['coins.rDid', 'coins.rFirst', 'coins.rNew', 'coins.rDeadline', 'coins.rGem']
