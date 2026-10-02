import { t } from './i18n.js'

// The status line under a gift you sent.
export function sentGiftStatus(row) {
  if (row.returned_at) {
    const n = Number(row.gems) || Number(row.coins) || 0
    return row.gems ? t('gifts.backGems', { n }) : t('gifts.backCoins', { n })
  }
  return row.claimed_at ? t('gifts.opened') : t('gifts.waiting')
}

const GIFT_KINDS = new Set(['look', 'buddy', 'accessory'])

// The kind a gift row shows as. Anything unknown (older free cheers) is a cheer.
export function sentGiftType(row) {
  return GIFT_KINDS.has(row.kind) ? row.kind : 'cheer'
}

// The Collection tab a gift of this kind lands in.
export function giftTab(type) {
  return { look: 'looks', buddy: 'buddies', accessory: 'accessories' }[type] || 'cheers'
}

export function sentGiftDate(row) {
  try {
    return new Date(row.made_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}
