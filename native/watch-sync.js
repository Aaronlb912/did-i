import { DeviceEventEmitter, NativeModules, Platform } from 'react-native'
import { requireOptionalNativeModule } from 'expo'
import { t } from '../src/lib/i18n.js'
import { hallColors } from './palette.js'
import { BUDDY_PARTS } from '../src/lib/buddy-parts.js'
import { GRACE_END } from '../src/lib/zone.js'
import { shelfStreak } from '../src/lib/hall-feel.js'
import { watchCount } from '../src/lib/watch-count.js'

// Apple Watch (modules/didi-watch, targets/watch) and Wear OS (android/wear,
// WatchModule in android/app). The phone sends the same cards the Tonight
// widget gets; the watch sends taps back. Web and phones without a watch:
// nothing happens.
let watchMod
function watch() {
  if (watchMod !== undefined) return watchMod
  if (Platform.OS === 'ios') watchMod = requireOptionalNativeModule('DidIWatch') || null
  else if (Platform.OS === 'android') watchMod = NativeModules.DidIWatch || null
  else watchMod = null
  return watchMod
}

// Only what the watch draws. Did we cards open the app, so they stay off it.
// shelf is optional: without it the watch shows no streak.
export function watchCardsFromProps(props, shelf = null) {
  // The watch screen is black, so it always takes the look's dark colours.
  const look = hallColors(props?.colors?.look || 'lime', 'dark')
  const colors = {
    accent: look.on,
    ink: look.ink,
    soft: look.inkSoft,
    card: look.panel,
    card2: look.panel2,
    line: look.line,
    bg: '#000000',
  }
  const parts = BUDDY_PARTS[String(props?.buddyId || '')] || null
  const shapes = parts ? props?.buddyShapes : null
  const cards = (Array.isArray(props?.items) ? props.items : [])
    .filter((item) => item?.lampId && !String(item.lampId).startsWith('we:'))
    .map((item) => ({
      id: String(item.lampId),
      night: String(item.periodKey || ''),
      dateIso: String(item.dateIso || ''),
      question: String(item.question || item.label || ''),
      tag: String(item.tag || ''),
      status: item.status === 'yes' ? 'did' : item.status === 'skip' ? 'nope' : 'open',
    }))
  // The count matches Today's meter (src/lib/watch-count.js): each card says
  // whether it counts, and done / later carry the counted ones with no card.
  const count = watchCount(shelf, cards)
  const items = shelf ? cards.map((card) => ({ ...card, counted: count.counted.has(`${card.id}|${card.night}`) })) : cards
  return {
    items,
    didLabel: String(props?.didLabel || ''),
    nopeLabel: String(props?.nopeLabel || ''),
    clearLabel: String(props?.clearLabel || ''),
    emptyLabel: String(props?.emptyLabel || ''),
    // The watch fills {n}, {a} and {b} itself, in the phone's language.
    leftLabel: t('widget.tonight.left', { n: '{n}' }),
    allDoneLabel: t('watch.allDone'),
    notYetLabel: t('watch.notYet', { n: '{n}' }),
    countLabel: t('watch.count', { a: '{a}', b: '{b}' }),
    ...(shelf ? { done: count.done, later: count.later } : {}),
    // Did we cards open the app, so the watch only says how many wait there.
    ...(Number(props?.weLeft) > 0
      ? { phoneWaiting: Number(props.weLeft), phoneWaitingLabel: t('watch.waiting', { n: '{n}' }) }
      : {}),
    lookAgainLabel: t('watch.lookAgain'),
    // Cards from before today go stale on the watch once this hour has passed.
    graceEndHour: GRACE_END,
    openPhoneLabel: t(Platform.OS === 'android' ? 'watch.openPhoneAndroid' : 'watch.openPhone'),
    colors,
    // Base shapes plus worn accessories, in the widget's part format.
    buddy: parts ? { parts, behind: shapes?.behind || [], front: shapes?.front || [] } : null,
    // Gentle mode: no streak numbers, same as the widgets.
    streak: !props?.gentle && shelf ? shelfStreak(shelf.boards || []) : 0,
    streakLabel: t('tonight.streakMany', { n: '{n}' }),
    streakOneLabel: t('tonight.streakOne'),
    // What the streak reads once the last open question is done.
    ...(!props?.gentle && shelf ? { streakIfDone: shelfStreak(shelf.boards || []) + (Number(props?.left) > 0 ? 1 : 0) } : {}),
    // The look tones the phone's confetti uses (CheerBurst: on, gold, blue, ink).
    cheer: [look.on, look.onDeep, look.late, look.ink].filter(Boolean),
    updatedAt: Number(props?.updatedAt) || Date.now(),
    // Watch taps (their at) this phone has saved or turned down. The watch
    // keeps showing a tap until its at is here or the card shows an answer.
    // Wear OS taps come in through the widget tap queue and are noted there.
    // Left out while empty (a fresh start): the watch then uses its older rule
    // and does not hold a tap the phone turned down before it restarted.
    ...(takenTaps.length ? { taken: [...takenTaps] } : {}),
  }
}

let lastSent = ''
// Recent watch taps the phone has handled, by their at (ms). Memory only: after
// a restart the watch just holds an unseen tap a while longer (24h at most).
const takenTaps = []
export function noteTaken(at) {
  const n = Number(at)
  if (!n || takenTaps.includes(n)) return
  takenTaps.push(n)
  if (takenTaps.length > 50) takenTaps.shift()
}

export function sendWatchCards(props, shelf = null) {
  const mod = watch()
  if (!mod?.sendCards) return
  try {
    const cards = watchCardsFromProps(props, shelf)
    const key = JSON.stringify({ ...cards, updatedAt: 0 })
    if (key === lastSent) return
    lastSent = key
    // at: when the phone sent these. The watch drops a delivered tap that is
    // older, so an undo on the phone shows there too.
    mod.sendCards(JSON.stringify({ ...cards, at: Date.now() }))
  } catch {
    // No watch is fine.
  }
}

// takePendingTaps empties the native queue and the watch never sends a tap
// twice, so a tap that failed to apply is kept here and tried again.
const RETRY_KEY = 'did-i-watch-retry'
function readRetry() {
  try {
    const list = JSON.parse(localStorage.getItem(RETRY_KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}
function writeRetry(list) {
  try {
    if (list.length) localStorage.setItem(RETRY_KEY, JSON.stringify(list.slice(-50)))
    else localStorage.removeItem(RETRY_KEY)
  } catch {
    // Kept in memory for this run only.
  }
}

// onTap({ id, answer: 'did' | 'nope', night, dateIso, at }). Returns a stop function.
// Android: WatchTapService already saved the tap in the widget tap queue, so
// onQueued() takes that queue instead (no tap is applied twice).
export function listenForWatchTaps(onTap, onQueued) {
  if (Platform.OS === 'android') {
    if (!watch() || !onQueued) return () => {}
    const sub = DeviceEventEmitter.addListener('onWatchTap', () => onQueued())
    return () => sub?.remove?.()
  }
  const mod = watch()
  if (!mod?.addListener) return () => {}
  // Newer builds save every tap natively and send an empty event; older ones
  // send the tap itself. Either way, take the saved queue too.
  const take = (tap) => {
    const taps = readRetry()
    try {
      taps.push(...(mod.takePendingTaps?.() || []))
    } catch {
      // Nothing queued.
    }
    if (tap?.id) taps.push(tap)
    // One tap that fails must not drop the rest, or tell the watch it landed.
    const failed = []
    for (const item of taps) {
      try {
        onTap(item)
        noteTaken(item?.at)
      } catch {
        failed.push(item)
      }
    }
    writeRetry(failed)
  }
  const sub = mod.addListener('onWatchTap', take)
  take(null)
  return () => sub?.remove?.()
}

// The phone may say no (the night turned, or it was already answered): send
// the cards again so the watch shows what the phone has.
export function resendWatchCards() {
  lastSent = ''
}
