import { Linking } from 'react-native'
import { readShelf } from '../../src/lib/board-shelf.js'
import { clockWords } from '../../src/lib/hall-pages.js'
import { t } from '../../src/lib/i18n.js'
import { armLampPings, checkPings, requestPings } from '../../src/lib/notify.js'
import { publishSheet, whenNoSheet } from '../components/SheetHost.jsx'
import { offerExactAlarms } from './exact-alarms.js'

const KEY = 'did-i-ping-primer'
// The one later ask, after a first Did, for people who said Not now.
const AGAIN_KEY = 'did-i-ping-primer-again'
let shownThisRun = false

// AppShell holds the permission state the Notifications screen shows; a
// primer answered anywhere has to reach it.
let listen = null
export function onPingState(fn) {
  listen = fn
  return () => {
    if (listen === fn) listen = null
  }
}

function primerShown(key = KEY) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function markPrimerShown(key = KEY) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    // ok
  }
}

// The phone lets an app ask once, so a primer frames the OS prompt instead of
// firing it cold. At most once per phone, and only while it has not been asked.
async function showPrimer({ title, body, colors, key = KEY }) {
  if (primerShown(key)) return
  if ((await checkPings().catch(() => 'missing')) !== 'default') return
  markPrimerShown(key)
  shownThisRun = true
  await whenNoSheet()
  publishSheet({
    kicker: t('notify.primerKicker'),
    title,
    body,
    goLabel: t('notify.primerGo'),
    closeLabel: t('notify.primerSkip'),
    colors,
    onClose: () => publishSheet(null),
    onGo: () => {
      publishSheet(null)
      requestPings()
        .then((state) => {
          listen?.(state)
          if (state === 'granted') {
            armLampPings(readShelf().boards)
            offerExactAlarms(colors).catch(() => {})
          }
        })
        .catch(() => {})
    },
  })
}

// A question just got a reminder time.
export async function offerPingPrimer(askAfter, colors) {
  if (!askAfter) return
  await showPrimer({
    title: t('notify.primerTitle', { time: clockWords(askAfter) }),
    body: t('notify.primerBody'),
    colors,
  })
}

// First run, just past sign-in, so nobody has to go looking for it.
export function offerFirstPingPrimer(colors) {
  return showPrimer({ title: t('notify.firstTitle'), body: t('notify.firstBody'), colors })
}

// One more ask, after a Did, if the first was Not now. Never in the same
// run as the first, and never again after this.
export function offerPingPrimerAgain(colors) {
  if (shownThisRun || !primerShown() || primerShown(AGAIN_KEY)) return Promise.resolve()
  return showPrimer({ title: t('notify.againTitle'), body: t('notify.againBody'), colors, key: AGAIN_KEY })
}

// A Turn on tap where the phone has notifications off. Asks if it still can;
// once the phone has said no, only its settings can undo that.
export async function askPingsNow(colors) {
  const state = await checkPings().catch(() => 'missing')
  if (state === 'denied') {
    Linking.openSettings().catch(() => {})
    return state
  }
  const next = await requestPings().catch(() => 'denied')
  listen?.(next)
  if (next === 'granted') {
    Promise.resolve(armLampPings(readShelf().boards)).catch(() => {})
    offerExactAlarms(colors).catch(() => {})
  }
  return next
}
