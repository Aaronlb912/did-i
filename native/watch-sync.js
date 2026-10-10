import { Platform } from 'react-native'
import { requireOptionalNativeModule } from 'expo'

// Apple Watch (modules/didi-watch, targets/watch). The iPhone sends the same
// cards the Tonight widget gets; the watch sends taps back. Android, web and
// iPhones without a paired watch: nothing happens.
let watchMod
function watch() {
  if (Platform.OS !== 'ios') return null
  if (watchMod === undefined) watchMod = requireOptionalNativeModule('DidIWatch') || null
  return watchMod
}

// Only what the watch draws. Did we cards open the app, so they stay off it.
export function watchCardsFromProps(props) {
  const items = (Array.isArray(props?.items) ? props.items : [])
    .filter((item) => item?.lampId && !String(item.lampId).startsWith('we:'))
    .map((item) => ({
      id: String(item.lampId),
      night: String(item.periodKey || ''),
      dateIso: String(item.dateIso || ''),
      question: String(item.question || item.label || ''),
      tag: String(item.tag || ''),
      status: item.status === 'yes' ? 'did' : item.status === 'skip' ? 'nope' : 'open',
    }))
  return {
    items,
    didLabel: String(props?.didLabel || ''),
    nopeLabel: String(props?.nopeLabel || ''),
    clearLabel: String(props?.clearLabel || ''),
    updatedAt: Number(props?.updatedAt) || Date.now(),
  }
}

let lastSent = ''

export function sendWatchCards(props) {
  const mod = watch()
  if (!mod?.sendCards) return
  try {
    const cards = watchCardsFromProps(props)
    const key = JSON.stringify({ ...cards, updatedAt: 0 })
    if (key === lastSent) return
    lastSent = key
    mod.sendCards(JSON.stringify(cards))
  } catch {
    // No watch is fine.
  }
}

// onTap({ id, answer: 'did' | 'nope', night, dateIso, at }). Returns a stop function.
export function listenForWatchTaps(onTap) {
  const mod = watch()
  if (!mod?.addListener) return () => {}
  const sub = mod.addListener('onWatchTap', (tap) => onTap(tap))
  try {
    for (const tap of mod.takePendingTaps?.() || []) onTap(tap)
  } catch {
    // Nothing queued.
  }
  return () => sub?.remove?.()
}

// The phone may say no (the night turned, or it was already answered): send
// the cards again so the watch shows what the phone has.
export function resendWatchCards() {
  lastSent = ''
}
