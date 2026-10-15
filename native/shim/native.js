import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { requireOptionalNativeModule } from 'expo'
import * as Linking from 'expo-linking'
import * as SplashScreen from 'expo-splash-screen'
import { AppState, BackHandler, Platform, Share } from 'react-native'
import { lampBuzzes, lampNudgesLate } from '../../src/lib/board-json.js'
import { t } from '../../src/lib/i18n.js'
import { ASK_CATEGORY, askActions, askNoteData } from '../../src/lib/notify-answer.js'
import { afterQuiet, gentleOn, pingOn } from '../../src/lib/prefs.js'
import { streakHitCopy } from '../../src/lib/streak-copy.js'
import { boardDate, dueTonight, waitingTonight } from '../../src/lib/recurrence.js'
import { setAppForeground } from '../../src/lib/app-foreground.js'
import { setErrorAppVersion } from '../../src/lib/app-errors.js'
import { graceRiskFire, streakRiskFire } from '../../src/lib/streak-risk.js'
import { clockWords } from '../../src/lib/hall-pages.js'
import { shelfStreak } from '../../src/lib/hall-feel.js'
import { readWePings } from '../../src/lib/we-widget.js'
import { goFromDeepLink, routeFromDeepLink } from '../deep-link.js'
import { goHash } from '../navigation/hash.js'
import { makeFeelTap } from '../lib/feel-tap.js'
export function isNativeHall() {
  return true
}

export function isAppForeground() {
  return AppState.currentState === 'active'
}

export async function bootNative() {
  setAppForeground(AppState.currentState === 'active')
  import('expo-application')
    .then((Application) => setErrorAppVersion(Application.nativeApplicationVersion))
    .catch(() => {})
  AppState.addEventListener('change', (next) => {
    setAppForeground(next === 'active')
    // The app may be killed in the background before the 500ms debounce fires.
    if (next !== 'active') flushNativePings()
  })
}

async function notifications() {
  return import('expo-notifications')
}

export async function pingStreakHit(hit, dateIso) {
  // Gentle mode: the count is the point of this one, so it is not sent.
  if (!hit || !pingOn('streakHit') || gentleOn()) return false
  const allowed = await checkNativePings()
  if (allowed !== 'granted') return false
  try {
    const Notifications = await notifications()
    await Notifications.scheduleNotificationAsync({
      identifier: String(notifyId('streak-hit', dateIso)),
      content: {
        ...streakHitCopy(hit.n),
        data: { go: '/tonight', streakHit: true },
      },
      trigger: null,
    })
    return true
  } catch {
    return false
  }
}

// A sample reminder a few seconds out, so you can see notifications work.
// 'off' means permission is not on; the caller sends you to settings.
export async function pingTest(seconds = 5) {
  if ((await checkNativePings()) !== 'granted') return 'off'
  try {
    const Notifications = await notifications()
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: t('push.channelName'),
        description: t('push.channelDesc'),
        importance: Notifications.AndroidImportance.HIGH,
      }).catch(() => {})
    }
    await Notifications.scheduleNotificationAsync({
      identifier: 'did-i-test',
      content: { title: 'Did I', body: t('pings.testBody'), data: { go: '/tonight' } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        channelId: CHANNEL_ID,
      },
    })
    return 'set'
  } catch {
    return 'miss'
  }
}

function notifyId(lampId, periodKey) {
  const text = `${lampId}:${periodKey}`
  let hash = 1
  for (let i = 0; i < text.length; i += 1) {
    hash = (Math.imul(hash, 31) + text.charCodeAt(i)) >>> 0
  }
  return (hash % 2147483646) + 1
}

export async function checkNativePings() {
  try {
    const { verifyNotificationPermission } = await import('../lib/notification-perms.js')
    const check = await verifyNotificationPermission()
    if (!check.ok) return 'missing'
    if (check.status === 'granted') return 'granted'
    // Android reports denied before it has ever asked; canAskAgain tells the two apart.
    if (check.status === 'denied' && !check.canAskAgain) return 'denied'
    if (check.status === 'denied') return 'default'
    return 'default'
  } catch {
    return 'missing'
  }
}

export async function requestNativePings() {
  try {
    const { askNotificationPermission } = await import('../lib/notification-perms.js')
    const status = await askNotificationPermission()
    if (status === 'granted') {
      const { syncPushTokenIfAllowed } = await import('./push.js')
      await syncPushTokenIfAllowed()
      return 'granted'
    }
    if (status === 'denied') return 'denied'
    return 'default'
  } catch {
    return 'denied'
  }
}

// A week ahead, so reminders still come on nights the app is never opened.
const PING_DAYS = 7
// iOS keeps at most 64 pending; leave room for the streak and cheer pings.
const PING_CAP = 60
const CHANNEL_ID = 'did-i'
// Same as LATE_NUDGE_HOUR in src/lib/notify.js.
const LATE_NUDGE_HOUR = 21

// Calls bunch up (a tap and armLampPings land together). The last call in
// a 500ms window wins, and runs only after the one before it finishes, so a
// cancel-all never lands in the middle of another run's schedule.
let pingChain = Promise.resolve()
let pingTimer = null
let pingNext = null
export function scheduleNativePings(books, now) {
  return new Promise((resolve, reject) => {
    const waiters = pingNext ? pingNext.waiters : []
    waiters.push({ resolve, reject })
    pingNext = { books, now, waiters }
    clearTimeout(pingTimer)
    pingTimer = setTimeout(flushNativePings, 500)
  })
}

function flushNativePings() {
  clearTimeout(pingTimer)
  const job = pingNext
  if (!job) return
  pingNext = null
  pingChain = pingChain
    .then(() => schedulePingsNow(job.books, job.now || new Date()))
    .then(
      () => job.waiters.forEach((w) => w.resolve()),
      (error) => job.waiters.forEach((w) => w.reject(error)),
    )
}

// Takes one board or every board on the shelf; each tag's questions ping.
async function schedulePingsNow(books, now = new Date()) {
  const list = (Array.isArray(books) ? books : [books]).filter(Boolean)
  if (!list.length) return
  try {
    const allowed = await checkNativePings()
    if (allowed !== 'granted') return
    const Notifications = await notifications()
    try {
      await Notifications.cancelAllScheduledNotificationsAsync()
    } catch {
      // ok
    }
    if (Platform.OS === 'android') {
      // A ping sent to a channel that does not exist yet never shows.
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: t('push.channelName'),
        description: t('push.channelDesc'),
        importance: Notifications.AndroidImportance.HIGH,
      }).catch(() => {})
    }
    // Did and Nope buttons on a question reminder. They answer without opening
    // the app (native/shim/push.js saves it like a widget tap).
    await Notifications.setNotificationCategoryAsync(ASK_CATEGORY, askActions(t)).catch(() => {})
    const when = (at) => ({
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: afterQuiet(at),
      channelId: CHANNEL_ID,
    })
    const notes = []
    const reminders = pingOn('reminders')
    for (const book of list) {
      for (let ahead = 0; ahead < PING_DAYS; ahead += 1) {
        // Midday of that calendar day sits inside the right board night.
        const day = ahead === 0 ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead, 12)
        // Every open row, so a re-arm after the ask time still keeps the 21:00
        // late note. The ask note itself only goes to rows still waiting.
        const rows = dueTonight(book, day).filter((row) => !row.answer)
        const waiting = ahead === 0 ? new Set(waitingTonight(book, now).map((row) => `${row.lamp.id}:${row.periodKey}`)) : null
        const [year, month, date] = boardDate(day).split('-').map(Number)
        for (const row of rows) {
          // Low priority stays quiet, like the web (src/lib/notify.js upcomingPings).
          if (!reminders || !lampBuzzes(row.lamp)) continue
          const match = String(row.lamp.askAfter || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/)
          if (!match) continue
          const at = new Date(year, month - 1, date, Number(match[1]), Number(match[2]), 0, 0)
          const content = {
            title: 'Did I',
            body: row.lamp.question,
            data: askNoteData(row),
            categoryIdentifier: ASK_CATEGORY,
          }
          if (at.getTime() > now.getTime() && (!waiting || waiting.has(`${row.lamp.id}:${row.periodKey}`))) {
            notes.push({
              identifier: String(notifyId(row.lamp.id, `${row.periodKey}:${row.dateIso}`)),
              content,
              trigger: when(at),
            })
          }
          // A high one still open gets a last call at 21:00.
          if (!lampNudgesLate(row.lamp)) continue
          const late = new Date(year, month - 1, date, LATE_NUDGE_HOUR, 0, 0, 0)
          if (late.getTime() <= now.getTime() || late.getTime() <= at.getTime()) continue
          // Quiet hours would push it to morning, which is no last call.
          if (afterQuiet(late).getTime() !== late.getTime()) continue
          notes.push({
            identifier: String(notifyId(row.lamp.id, `${row.periodKey}:late:${row.dateIso}`)),
            content,
            trigger: when(late),
          })
        }
      }
    }
    // Did we questions with a time and the reminder on, from the last list
    // the app saved. Skipped on a night you already answered.
    if (reminders) {
      for (const we of readWePings()) {
        const match = String(we.askAfter || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/)
        if (!match) continue
        for (let ahead = 0; ahead < PING_DAYS; ahead += 1) {
          const day = ahead === 0 ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead, 12)
          const night = boardDate(day)
          if (night < String(we.startsOn || '') || night === we.skipNight) continue
          if (we.cadence === 'weekly' && !(we.weekdays || []).includes(day.getDay())) continue
          const [year, month, date] = night.split('-').map(Number)
          const at = new Date(year, month - 1, date, Number(match[1]), Number(match[2]), 0, 0)
          if (at.getTime() <= now.getTime()) continue
          notes.push({
            identifier: String(notifyId(`we:${we.id}`, night)),
            content: {
              title: 'Did we',
              body: we.question,
              data: { go: '/tonight', weId: we.id, night },
              categoryIdentifier: ASK_CATEGORY,
            },
            trigger: when(at),
          })
        }
      }
    }
    notes.sort((a, b) => a.trigger.date - b.trigger.date)
    notes.length = Math.min(notes.length, PING_CAP)
    // Any folder's streak can be at risk, not only the first one's.
    const streakPings = pingOn('streakRisk') && !gentleOn()
    const heat = streakPings ? shelfStreak(list, now) : null
    const risk = streakPings ? list.map((item) => streakRiskFire(item, now, heat)).find(Boolean) : null
    if (risk) {
      notes.push({
        identifier: String(notifyId('streak', risk.tag)),
        content: {
          title: t('streak.riskTitle'),
          body: t('streak.riskBody', { time: clockWords('09:00') }),
          data: { go: '/tonight', streakRisk: true },
        },
        trigger: when(new Date(risk.at)),
      })
    }
    const grace = streakPings ? list.map((item) => graceRiskFire(item, now, heat)).find(Boolean) : null
    if (grace) {
      notes.push({
        identifier: String(notifyId('streak', grace.tag)),
        content: {
          title: t('streak.riskTitle'),
          body: t('streak.graceBody', { time: clockWords('09:00') }),
          data: { go: '/tonight', streakRisk: true },
        },
        trigger: when(new Date(grace.at)),
      })
    }
    for (const note of notes) {
      try {
        await Notifications.scheduleNotificationAsync(note)
      } catch {
        // Some ROMs block exact alarms.
      }
    }
  } catch {
    // Notifications native module not ready or misconfigured.
  }
}

// Haptics follow the phone's own haptics setting, not Reduce Motion: that
// setting is about movement on screen, and a tap you feel is not movement.
// Did is a success, nope a soft bump, undo a rigid one, and crossing the Did
// or nope edge of a swipe a selection tick. Android speaks its own
// HapticFeedbackConstants (CONFIRM, REJECT, GESTURE_THRESHOLD_ACTIVATE), which
// also honour its touch feedback switch; a phone too old for one falls back
// to the vibrator pattern iOS's style maps to.
const android = Platform.OS === 'android'

let edgeModule
function thresholdModule() {
  if (edgeModule === undefined) {
    try {
      edgeModule = requireOptionalNativeModule('DidIHaptics')
    } catch {
      edgeModule = null
    }
  }
  return edgeModule
}

const feel = makeFeelTap({ Haptics, android, thresholdModule })

export function feelTap(kind) {
  feel(kind)
}

// The phone has no Did sound (the website's click is Web Audio), so there is
// nothing to play and no setting for it.
export function playClick() {}

export async function passAlong(text, title) {
  const line = String(text || '')
  if (!line) return ''
  try {
    const out = await Share.share({ title: title || 'Did I', message: line })
    if (out?.action === Share.sharedAction) return 'shared'
  } catch {
    // Share failed; fall through to clipboard.
  }
  try {
    await Clipboard.setStringAsync(line)
    return 'copied'
  } catch {
    return ''
  }
}

export async function copyText(text) {
  try {
    await Clipboard.setStringAsync(String(text || ''))
    return true
  } catch {
    return false
  }
}

export async function shareShelf(shelf) {
  const stamp = boardDate(new Date(), 4)
  const text = JSON.stringify(shelf, null, 2)
  await Share.share({ title: 'Did I', message: text })
}

// Same share path as the text copy; paste into a .csv or a sheet.
export async function shareCsv(text) {
  await Share.share({ title: 'Did I', message: text })
}

export async function shareBook(book) {
  const stamp = boardDate(new Date(), book.dayFoldHour)
  const slug =
    String(book.title || 'board')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'board'
  const text = JSON.stringify(book, null, 2)
  await Share.share({ title: book.title || 'Did I', message: text })
}

function lampFromUrl(url) {
  const route = routeFromDeepLink(url)
  if (route?.face) return route.face
  return ''
}

export function listenNativeShell({ onBack, onOpenLamp }) {
  // False at the root lets Android leave the app, the system back everywhere else.
  const backSub = BackHandler.addEventListener('hardwareBackPress', () => Boolean(onBack?.()))
  const linkSub = Linking.addEventListener('url', ({ url }) => {
    if (goFromDeepLink(url)) return
    const lampId = lampFromUrl(url)
    onOpenLamp?.(lampId || '')
  })
  Linking.getInitialURL()
    .then((url) => {
      if (!url) return
      if (goFromDeepLink(url)) return
      const lampId = lampFromUrl(url)
      if (lampId) onOpenLamp?.(lampId)
      else onOpenLamp?.('')
    })
    .catch(() => {})
  return () => {
    backSub.remove()
    linkSub.remove()
  }
}
