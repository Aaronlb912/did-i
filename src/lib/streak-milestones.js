import { t } from './i18n.js'
import { FRAMES, frameLive, frameText } from './frames.js'
import { markStreakSeen, streakSeen } from './streak-moments.js'

// The streaks the done card makes a moment of, once each.
export const STREAK_MILESTONES = [7, 30, 100, 365]
// Gems the server pays once per account (supabase/streak-bonus.sql).
export const STREAK_BONUS = { 30: 1, 100: 2 }
const PENDING = 'did-i-streak-bonus-pending'

export function isStreakMilestone(n) {
  return STREAK_MILESTONES.includes(Math.floor(Number(n)) || 0)
}

// The frame a streak of exactly n unlocks, or ''.
export function milestoneFrame(n, today) {
  const frame = FRAMES.find((item) => item.kind === 'earned' && item.earn === 'streak' && item.need === n && frameLive(item, today))
  return frame ? frame.id : ''
}

// "30 days in a row. Ember is yours." or "365 days in a row".
export function milestoneLine(n, today) {
  const id = milestoneFrame(n, today)
  return id ? t('milestone.frame', { n, frame: t(frameText(id, 'name')) }) : t('milestone.days', { n })
}

export function milestoneGemLine(paid) {
  const n = Math.max(0, Math.floor(Number(paid) || 0))
  if (!n) return ''
  return n === 1 ? t('milestone.gemOne') : t('milestone.gemMany', { n })
}

// True once per milestone on this phone; the second call is false.
export function takeStreakMilestone(n) {
  if (!isStreakMilestone(n) || streakSeen('milestone', String(n))) return false
  markStreakSeen('milestone', String(n))
  return true
}

// Bonus claims that did not reach the server, tried again on the next open.
export function readBonusPending() {
  try {
    const list = JSON.parse(localStorage.getItem(PENDING) || '[]')
    return Array.isArray(list) ? list.filter((days) => STREAK_BONUS[days]) : []
  } catch {
    return []
  }
}

function writeBonusPending(list) {
  try {
    if (list.length) localStorage.setItem(PENDING, JSON.stringify(list))
    else localStorage.removeItem(PENDING)
  } catch {
    // ok: the claim is not tried again
  }
}

export function addBonusPending(days) {
  const list = readBonusPending()
  if (STREAK_BONUS[days] && !list.includes(days)) writeBonusPending([...list, days])
}

export function dropBonusPending(days) {
  writeBonusPending(readBonusPending().filter((item) => item !== days))
}
