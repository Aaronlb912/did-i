import { frameText } from './frames.js'
import { t } from './i18n.js'
import { buddyText, cheerText, lookText } from './purse.js'

// The status line under a gift you sent.
export function sentGiftStatus(row) {
  if (row.returned_at) {
    const n = Number(row.gems) || Number(row.coins) || 0
    return row.gems ? t('gifts.backGems', { n }) : t('gifts.backCoins', { n })
  }
  if (row.thanked_at) return t('gifts.thanked')
  return row.claimed_at ? t('gifts.opened') : t('gifts.waiting')
}

const GIFT_KINDS = new Set(['look', 'buddy', 'accessory', 'frame'])

// The kind a gift row shows as. Anything unknown (older free cheers) is a cheer.
export function sentGiftType(row) {
  return GIFT_KINDS.has(row.kind) ? row.kind : 'cheer'
}

// The Collection tab a gift of this kind lands in.
export function giftTab(type) {
  return { look: 'looks', buddy: 'buddies', accessory: 'accessories', frame: 'frames' }[type] || 'cheers'
}

export function sentGiftDate(row) {
  try {
    return new Date(row.made_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

// The name of a gifted item, in the reader's language.
export function giftItemName(type, id) {
  if (type === 'accessory') return t(`accessory.${id}`)
  if (type === 'look') return t(lookText(id, 'name'))
  if (type === 'frame') return t(frameText(id, 'name'))
  if (type === 'buddy') return t(buddyText(id, 'name'))
  return t(cheerText(id, 'name'))
}

// A Recent line for the giver: someone said thanks for a gift.
export function giftThanksNotice(row) {
  const item = giftItemName(sentGiftType({ kind: row.kind }), row.item_id)
  return {
    id: `gift-thanks:${row.id}`,
    kind: 'gift',
    title: t('gifts.thanksTitle'),
    text: t('gifts.thanksBy', { name: row.to_name || t('people.someone'), item }),
    go: { path: '/gifts' },
  }
}
