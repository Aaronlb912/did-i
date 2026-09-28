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
