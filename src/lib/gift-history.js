import { t } from './i18n.js'

// The status line under a gift you sent.
export function sentGiftStatus(row) {
  if (row.returned_at) {
    const n = Number(row.gems) || Number(row.coins) || 0
    return row.gems ? t('gifts.backGems', { n }) : t('gifts.backCoins', { n })
  }
  return row.claimed_at ? t('gifts.opened') : t('gifts.waiting')
}

export function sentGiftType(row) {
  return row.kind === 'look' || row.kind === 'buddy' ? row.kind : 'cheer'
}

export function sentGiftDate(row) {
  try {
    return new Date(row.made_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}
