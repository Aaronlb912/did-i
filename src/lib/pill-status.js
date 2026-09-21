import { t } from './i18n.js'

export function pillStatusLabel(status) {
  if (status === 'yes') return t('pill.done')
  if (status === 'late') return t('pill.late')
  if (status === 'skip') return t('pill.nope')
  return t('pill.open')
}
