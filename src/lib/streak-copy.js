import { t } from './i18n.js'

// "On fire" is for a run, not for the first night.
export const STREAK_FIRE = 3

// What a streak hit says, in the push and in the app. One night is not
// "1 nights", and one or two nights are not a fire yet.
export function streakHitCopy(n) {
  const nights = Math.max(1, Math.floor(Number(n)) || 1)
  return {
    title: nights >= STREAK_FIRE ? t('streak.hitTitle') : t('streak.hitTitleClear'),
    body: nights === 1 ? t('streak.hitBodyOne') : t('streak.hitBody', { n: nights }),
  }
}

// "3 nights in a row" for the streak line on the done card.
export function streakNights(n) {
  const nights = Math.max(0, Math.floor(Number(n)) || 0)
  return nights === 1 ? t('tonight.streakOne') : t('tonight.streakMany', { n: nights })
}

// The streak line around its number, so the number alone can roll: "3 nights
// in a row" is { before: '', after: ' nights in a row' }. Null for one night,
// whose line has no number to roll.
export function streakParts(n) {
  const nights = Math.max(0, Math.floor(Number(n)) || 0)
  if (nights === 1) return null
  const mark = '\u0001'
  const line = t('tonight.streakMany', { n: mark })
  const at = line.indexOf(mark)
  if (at < 0) return null
  return { before: line.slice(0, at), after: line.slice(at + mark.length) }
}
