import { t } from './i18n.js'
import { shortLabel } from './board-json.js'

export function pillStatusLabel(status) {
  if (status === 'yes') return t('pill.done')
  if (status === 'late') return t('pill.late')
  if (status === 'skip') return t('pill.nope')
  return t('pill.open')
}

// The undo toast names the question, since the screen may already show
// another card. Short name, cut so the toast stays one line.
const NAME_MAX = 24

export function toastName(lamp) {
  const name = shortLabel(lamp)
  return name.length > NAME_MAX ? `${name.slice(0, NAME_MAX - 1).trimEnd()}…` : name
}

export function markedToast(status, lamp) {
  return t('pill.markedWhat', { status: pillStatusLabel(status), name: toastName(lamp) })
}
