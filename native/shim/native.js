import * as Clipboard from 'expo-clipboard'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as Haptics from 'expo-haptics'
import { requireOptionalNativeModule } from 'expo'
import * as Linking from 'expo-linking'
import * as SplashScreen from 'expo-splash-screen'
import { AppState, BackHandler, Platform, Share } from 'react-native'
import { daySection, lampBuzzes, lampNudgesLate, resumeDuePauses } from '../../src/lib/board-json.js'
import { t } from '../../src/lib/i18n.js'
import { ASK_CATEGORY, REMIND_CATEGORY, SEND_CATEGORY, SNOOZE_KEY, askActions, askNoteData, remindActions, sendActions, staleDelivered, staleInboxPushes } from '../../src/lib/notify-answer.js'
import { REMIND_TRIES, readReminds, remindNext } from '../../src/lib/remind-me.js'
import { afterQuiet, awayOn, gentleOn, pingOn, readPrefs } from '../../src/lib/prefs.js'
import { askGroups, capNotes, earlyCallAt, lastCallAt, laterClash, leftNote } from '../../src/lib/quiet.js'
import { backOffFrom, newestAnswerIso } from '../../src/lib/come-back.js'
import { streakHitCopy } from '../../src/lib/streak-copy.js'
import { boardDate, countedTonightRows, dueTonight, graceNightIso, nightOpen, pingWaitingTonight } from '../../src/lib/recurrence.js'
import { setAppForeground } from '../../src/lib/app-foreground.js'
import { setErrorAppVersion } from '../../src/lib/app-errors.js'
import { freezeCalmNights, graceRiskFire, openGraceNight, lastNightGraceFire, streakAtRisk, streakRiskFire } from '../../src/lib/streak-risk.js'
import { clockWords } from '../../src/lib/hall-pages.js'
import { AFTERNOON_AT_DEFAULT, DAY_NUDGE_TIMES, MORNING_AT_DEFAULT, dayNudges, pingAheads } from '../../src/lib/day-nudges.js'
import { freezeState, shelfStreak } from '../../src/lib/hall-feel.js'
import { readWePings, weMonthlyPingDay } from '../../src/lib/we-widget.js'
import { weNightStatus, weOpenOn } from '../../src/lib/we-nights.js'
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

// Android says denied before it has ever asked; this tells that from a block.
let canAsk = true
export function pingsCanAskAgain() {
  return canAsk
}

export async function checkNativePings() {
  try {
    const { verifyNotificationPermission } = await import('../lib/notification-perms.js')
    const check = await verifyNotificationPermission()
    if (!check.ok) {
      flagPingsFailed()
      return 'missing'
    }
    if (check.status === 'granted') return 'granted'
    canAsk = check.canAskAgain !== false
    if (check.status === 'denied') return 'denied'
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
    if (status === 'missing') {
      flagPingsFailed()
      return 'missing'
    }
    return 'default'
  } catch {
    return 'denied'
  }
}

// A week ahead, so reminders still come on nights the app is never opened.
const PING_DAYS = 7
// iOS keeps at most 64 pending; leave room for the streak and cheer pings.
// Android has no such limit (500 alarms per app), so a full week fits there.
const PING_CAP = Platform.OS === 'android' ? 200 : 60
// Over the cap, every kind of note in the next two days keeps its slot first.
const CAP_SOON_MS = 48 * 60 * 60 * 1000

function leftBody(n, at) {
  const { key, vars } = leftNote(n, at)
  return t(key, vars)
}
const CHANNEL_ID = 'did-i'
// Set when the whole scheduling run threw; the reminders screen shows a row.
const PING_FAILED_KEY = 'did-i-ping-failed'
export function flagPingsFailed() {
  try {
    localStorage.setItem(PING_FAILED_KEY, '1')
  } catch {
    // ok
  }
}
export function pingsFailed() {
  try {
    return localStorage.getItem(PING_FAILED_KEY) === '1'
  } catch {
    return false
  }
}

// The gap the come-back push was last set for, and when it fires.
const COME_BACK_PUSH_KEY = 'did-i-come-back-push'
function readComeBackPush() {
  try {
    const saved = JSON.parse(localStorage.getItem(COME_BACK_PUSH_KEY) || 'null')
    return saved && typeof saved.gap === 'string' && Number.isFinite(saved.at) ? saved : null
  } catch {
    return null
  }
}
function saveComeBackPush(gap, at) {
  try {
    localStorage.setItem(COME_BACK_PUSH_KEY, JSON.stringify({ gap, at }))
  } catch {
    // ok
  }
}

// Later on a reminder: the same note again in an hour. Kept in storage too,
// because a re-arm cancels every scheduled note not in its new list.
function snoozedNotes(now = Date.now()) {
  try {
    const list = JSON.parse(localStorage.getItem(SNOOZE_KEY) || '[]')
    return Array.isArray(list) ? list.filter((item) => item && item.identifier && item.at > now) : []
  } catch {
    return []
  }
}
// A question answered somewhere else (widget, reminder button, the app): its
// waiting Later notes go, in storage and on the phone.
export async function dropSnoozed({ lampId = '', weId = '' }) {
  if (!lampId && !weId) return
  try {
    const all = JSON.parse(localStorage.getItem(SNOOZE_KEY) || '[]')
    if (!Array.isArray(all)) return
    const gone = all.filter((item) => item?.content?.data && (lampId ? item.content.data.lampId === lampId : item.content.data.weId === weId))
    if (!gone.length) return
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(all.filter((item) => !gone.includes(item))))
    const Notifications = await notifications()
    for (const item of gone) {
      await Notifications.cancelScheduledNotificationAsync(item.identifier).catch(() => {})
      await Notifications.dismissNotificationAsync?.(item.identifier)?.catch?.(() => {})
    }
  } catch {
    // ok
  }
}
export async function snoozeNative(snooze) {
  if (!snooze) return
  try {
    const keep = snoozedNotes().filter((item) => item.identifier !== snooze.identifier)
    localStorage.setItem(SNOOZE_KEY, JSON.stringify([...keep, snooze]))
  } catch {
    // ok
  }
  try {
    const Notifications = await notifications()
    await Notifications.scheduleNotificationAsync({
      identifier: snooze.identifier,
      content: snooze.content,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: afterQuiet(new Date(snooze.at)), channelId: CHANNEL_ID },
    })
  } catch {
    // ok
  }
}

// Calls bunch up (a tap and armLampPings land together). The last call in
// a 500ms window wins, and runs only after the one before it finishes, so a
// cancel never lands in the middle of another run's schedule.
let pingChain = Promise.resolve()
let pingTimer = null
let pingNext = null

// The zone reminders were last set in. They are fixed instants, so after the
// phone moves zone they keep the old times until set again.
const PING_ZONE_KEY = 'did-i-ping-zone'
function pingZone() {
  return `${Intl.DateTimeFormat().resolvedOptions().timeZone}|${new Date().getTimezoneOffset()}`
}
// Reminders are set PING_DAYS ahead. Set again a day later so a week away
// from the app never runs them out.
const PING_AT_KEY = 'did-i-ping-at'
const PING_REFRESH_MS = 20 * 60 * 60 * 1000
export function pingsStale() {
  if (pingZoneMoved()) return true
  try {
    const at = Number(localStorage.getItem(PING_AT_KEY))
    // Never set (notifications were off at first) counts too: on in Settings later.
    return !(at > 0) || Date.now() - at > PING_REFRESH_MS
  } catch {
    return false
  }
}

export function pingZoneMoved() {
  try {
    const saved = localStorage.getItem(PING_ZONE_KEY)
    return Boolean(saved) && saved !== pingZone()
  } catch {
    return false
  }
}

export function scheduleNativePings(books, now) {
  return new Promise((resolve, reject) => {
    const waiters = pingNext ? pingNext.waiters : []
    waiters.push({ resolve, reject })
    pingNext = { books, now, waiters }
    clearTimeout(pingTimer)
    pingTimer = setTimeout(flushNativePings, 500)
  })
}

// Headless tasks (widget taps) can end before the 500ms timer: run at once.
export function armNativePingsNow(books) {
  const done = scheduleNativePings(books)
  flushNativePings()
  return done
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

// After the inbox loads: clear cheer and Did you pushes that no longer wait.
export async function dismissReadPushes(waitingIds) {
  try {
    const Notifications = await notifications()
    if (typeof Notifications.getPresentedNotificationsAsync !== 'function' || typeof Notifications.dismissNotificationAsync !== 'function') return
    const ids = staleInboxPushes(await Notifications.getPresentedNotificationsAsync(), new Set(waitingIds))
    for (const id of ids) await Notifications.dismissNotificationAsync(id)?.catch?.(() => {})
  } catch {
    // They stay in the tray.
  }
}

// Sign-out: drop a waiting run and cancel behind any run already going, so
// neither can put the old account's reminders back after the cancel.
export function clearNativePings() {
  clearTimeout(pingTimer)
  const job = pingNext
  pingNext = null
  job?.waiters.forEach((w) => w.resolve())
  pingChain = pingChain.then(() => notifications().then((n) => n.cancelAllScheduledNotificationsAsync().then(() => scheduleReminds(n)))).catch(() => {})
  return pingChain
}

// Remind me notes: local to the phone, so a cancel-all (sign-out, re-arm)
// puts the waiting ones back. The id carries the tries so a re-ask is its own note.
const remindNoteId = (item) => `remind:${item.id}:${item.tries || 0}`

async function scheduleOneRemind(Notifications, item) {
  await Notifications.setNotificationCategoryAsync(REMIND_CATEGORY, remindActions(t)).catch(() => {})
  await Notifications.scheduleNotificationAsync({
    identifier: remindNoteId(item),
    content: {
      title: 'Did I',
      body: readPrefs().pingsPrivate ? t('pings.privateBody') : t('remind.ask', { text: item.text }),
      data: { go: '/remind', remindId: item.id, remindText: item.text },
      categoryIdentifier: REMIND_CATEGORY,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Math.max(item.at, Date.now() + 2000)), channelId: CHANNEL_ID },
  })
}

// Cancels pending notes that are not in the new list, before the new ones are
// set. Same ids replace, so if the app is killed mid run the old notes stay.
async function cancelStale(Notifications, notes) {
  const keep = new Set(['did-i-test'])
  for (const note of notes) {
    const at = note.trigger?.date
    if (!(at instanceof Date) || at.getTime() > Date.now()) keep.add(note.identifier)
  }
  for (const item of readReminds()) {
    keep.add(remindNoteId(item))
    keep.add(remindNoteId({ ...item, tries: (item.tries || 0) + 1 }))
  }
  try {
    for (const note of await Notifications.getAllScheduledNotificationsAsync()) {
      if (!keep.has(note.identifier)) await Notifications.cancelScheduledNotificationAsync(note.identifier).catch(() => {})
    }
  } catch {
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {})
  }
}

async function scheduleReminds(Notifications) {
  for (let item of readReminds()) {
    // Fired over 5 minutes ago with no answer (swiped away, ignored): that counts
    // as a Not yet, so it asks again. The last try stays on Remind me to answer.
    if (item.at <= Date.now()) {
      if (item.at > Date.now() - 5 * 60 * 1000 || item.tries + 1 >= REMIND_TRIES) continue
      const out = remindNext(item, 'nope')
      if (!out.item) continue
      item = out.item
    }
    try {
      await scheduleOneRemind(Notifications, item)
    } catch {
      // ok
    }
  }
}

export async function scheduleRemind(item) {
  let allowed = await checkNativePings()
  if (allowed !== 'granted') allowed = await requestNativePings()
  if (allowed !== 'granted') return { miss: 'remind.notifOff' }
  try {
    const Notifications = await notifications()
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: t('push.channelName'),
        description: t('push.channelDesc'),
        importance: Notifications.AndroidImportance.HIGH,
      }).catch(() => {})
    }
    await scheduleOneRemind(Notifications, item)
    return { ok: true }
  } catch {
    return { miss: 'remind.notifOff' }
  }
}

export async function cancelRemind(item) {
  try {
    const Notifications = await notifications()
    for (let tries = 0; tries <= 3; tries += 1) {
      await Notifications.cancelScheduledNotificationAsync(remindNoteId({ ...item, tries })).catch(() => {})
    }
    await Notifications.dismissNotificationAsync?.(remindNoteId(item))?.catch?.(() => {})
  } catch {
    // ok
  }
}

// An answer (in the app, widget, watch or sync) cancels what is scheduled; this
// clears our own notes already in the tray that it made untrue. Old builds and
// shims without the calls do nothing.
async function dismissStale(Notifications, list, now, openRows) {
  try {
    if (typeof Notifications.getPresentedNotificationsAsync !== 'function' || typeof Notifications.dismissNotificationAsync !== 'function') return
    const presented = await Notifications.getPresentedNotificationsAsync()
    if (!Array.isArray(presented) || !presented.length) return
    const today = boardDate(now)
    const grace = graceNightIso(now)
    const heat = shelfStreak(list, now)
    const noon = (iso) => {
      const [y, m, d] = iso.split('-').map(Number)
      return new Date(y, m - 1, d, 12)
    }
    const riskOn = (night) => {
      if (night === today) return list.some((book) => streakAtRisk(book, now, heat))
      return night === grace && list.some((book) => streakAtRisk(book, noon(night), heat))
    }
    const ids = staleDelivered(presented, {
      answered: (lampId, night) => list.some((book) => (book.answers || []).some((a) => a.lampId === lampId && a.periodKey === night && (a.status === 'yes' || a.status === 'late'))),
      weDid: (weId, night) => weNightStatus(night, weId) === 'did',
      openToday: openRows.length > 0 || weOpenOn(today).size > 0,
      atRisk: (at) => {
        const when = new Date(at)
        return riskOn(graceNightIso(when) || boardDate(when))
      },
    })
    for (const id of ids) await Notifications.dismissNotificationAsync(id)?.catch?.(() => {})
  } catch {
    // The notes stay in the tray; nothing else depends on it.
  }
}

// Takes one board or every board on the shelf; each tag's questions ping.
async function schedulePingsNow(books, now = new Date()) {
  // An empty list still runs: it clears what an old account left scheduled.
  const list = (Array.isArray(books) ? books : [books]).filter(Boolean)
  try {
    const allowed = await checkNativePings()
    if (allowed !== 'granted') return
    const Notifications = await notifications()
    if (Platform.OS === 'android') {
      // A ping sent to a channel that does not exist yet never shows.
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: t('push.channelName'),
        description: t('push.channelDesc'),
        importance: Notifications.AndroidImportance.HIGH,
      }).catch(() => {})
    }
    // Did and Not yet buttons on a question reminder. They open the app for a
    // moment (opensAppToForeground), and native/shim/push.js saves the answer
    // like a widget tap.
    await Notifications.setNotificationCategoryAsync(ASK_CATEGORY, askActions(t)).catch(() => {})
    // Keep and Pass too, so a language change reaches them without a restart.
    await Notifications.setNotificationCategoryAsync(SEND_CATEGORY, sendActions(t)).catch(() => {})
    const when = (at) => ({
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: afterQuiet(at),
      channelId: CHANNEL_ID,
    })
    // iOS ask and late notes follow the wall clock (DST, travel). Built at schedule time so notes keep trigger.date.
    const wallTrigger = (trigger) => {
      const d = trigger.date
      return {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
        hour: d.getHours(),
        minute: d.getMinutes(),
        repeats: false,
      }
    }
    const notes = []
    const reminders = pingOn('reminders')
    // Away days do not use up the week, so reminders come back after they end.
    const aheads = pingAheads(now, PING_DAYS)
    // Three due days with no answer: from then on one note per question, no
    // second time, last call or day nudges. Any answer sets them again.
    const today = boardDate(now)
    const backOff = backOffFrom(list, today, (iso) => {
      const [y, m, d] = iso.split('-').map(Number)
      return !awayOn(iso) && list.some((book) => dueTonight(book, new Date(y, m - 1, d, 12)).some((row) => !row.answer || row.answer.status === 'skip'))
    })
    for (const listed of list) {
      for (const ahead of aheads) {
        // Midday of that calendar day sits inside the right board night.
        const day = ahead === 0 ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead, 12)
        // Every open row, so a re-arm after the ask time still keeps the 21:00
        // late note. The ask note itself only goes to rows still waiting.
        // Not yet (status skip) is not done, so it keeps the late note too.
        // A question paused until a day by then is asked that day.
        const book = resumeDuePauses(listed, boardDate(day))
        const rows = dueTonight(book, day).filter((row) => !row.answer || row.answer.status === 'skip')
        const waiting = ahead === 0 ? new Set(pingWaitingTonight(book, now).map((row) => `${row.lamp.id}:${row.periodKey}`)) : null
        const night = boardDate(day)
        const [year, month, date] = night.split('-').map(Number)
        for (const row of rows) {
          // Low priority stays quiet, like the web (src/lib/notify.js upcomingPings).
          if (!reminders || !lampBuzzes(row.lamp)) continue
          // No time set: no ask note, but a high one still gets the late note.
          const match = String(row.lamp.askAfter || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/)
          const at = match ? new Date(year, month - 1, date, Number(match[1]), Number(match[2]), 0, 0) : null
          const content = {
            title: 'Did I',
            // Hide what it says: the lock screen shows no question.
            body: readPrefs().pingsPrivate ? t('pings.privateBody') : row.lamp.question,
            data: askNoteData(row),
            categoryIdentifier: ASK_CATEGORY,
          }
          // Quiet hours can push it past the time that day can still be answered.
          // A note quiet hours moved to morning still lies ahead after its ask time.
          const moved = at && afterQuiet(at).getTime() !== at.getTime()
          if (at && !row.answer && afterQuiet(at).getTime() > now.getTime() && nightOpen(night, afterQuiet(at)) && (!waiting || row.lamp.morning || moved || waiting.has(`${row.lamp.id}:${row.periodKey}`))) {
            notes.push({
              identifier: String(notifyId(row.lamp.id, `${row.periodKey}:${row.dateIso}`)),
              content,
              trigger: when(at),
              wall: true,
            })
          }
          // Second reminder time: same rules, cleared and rebuilt with the first.
          // Not tied to the first time having passed or not.
          const second = String(row.lamp.askAfter2 || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/)
          const at2 = at && second ? new Date(year, month - 1, date, Number(second[1]), Number(second[2]), 0, 0) : null
          // It waits like the first one, and quiet hours that land both on the
          // same minute send one note.
          const moved2 = at2 && afterQuiet(at2).getTime() !== at2.getTime()
          const sameMinute = at && at2 && afterQuiet(at).getTime() === afterQuiet(at2).getTime()
          if (at2 && !sameMinute && ahead < backOff && !row.answer && afterQuiet(at2).getTime() > now.getTime() && nightOpen(night, afterQuiet(at2)) && (!waiting || row.lamp.morning || moved2 || waiting.has(`${row.lamp.id}:${row.periodKey}`))) {
            notes.push({
              identifier: String(notifyId(row.lamp.id, `${row.periodKey}:${row.dateIso}:2`)),
              content,
              trigger: when(at2),
              wall: true,
              second: true,
            })
          }
          // A high one still open gets a last call. Backed off, only when it has no time of its own.
          if (!lampNudgesLate(row.lamp) || (ahead >= backOff && at)) continue
          // 21:00, or around quiet hours and the question's own time (lastCallAt).
          const late = lastCallAt(year, month, date, at2 && at2 > at ? at2 : at, readPrefs(), now)
          if (!late) continue
          notes.push({
            identifier: String(notifyId(row.lamp.id, `${row.periodKey}:late:${row.dateIso}`)),
            content: readPrefs().pingsPrivate ? content : { ...content, body: t('notif.stillOpen', { question: row.lamp.question }) },
            trigger: when(late),
            wall: true,
            lateCall: true,
          })
          // Same reminders switch as the last call. Grouped below.
          const early = ahead < backOff ? earlyCallAt(year, month, date, readPrefs(), now) : null
          if (early) notes.push({ identifier: '', content: { title: 'Did I', data: { go: '/tonight' } }, trigger: when(early), earlyCall: true, day: night })
        }
      }
    }
    // Several last calls at the same minute: one note, opening Today.
    const lateAt = new Map()
    for (const note of notes) {
      if (!note.lateCall) continue
      const key = note.trigger.date.getTime()
      lateAt.set(key, [...(lateAt.get(key) || []), note])
    }
    for (const [key, group] of lateAt) {
      if (group.length < 2) continue
      for (const note of group) notes.splice(notes.indexOf(note), 1)
      notes.push({
        identifier: String(notifyId('late', String(key))),
        content: { title: 'Did I', body: leftBody(group.length, group[0].trigger.date), data: { go: '/tonight', left: true } },
        trigger: group[0].trigger,
        lateCall: true,
        wall: true,
      })
    }
    // Earlier note: 2 or more open on one day make one, unless a last call
    // folded at the same minute already says the count and the hours.
    const earlyDay = new Map()
    for (const note of notes.filter((n) => n.earlyCall)) {
      notes.splice(notes.indexOf(note), 1)
      earlyDay.set(note.day, [...(earlyDay.get(note.day) || []), note])
    }
    for (const group of earlyDay.values()) {
      const at = group[0].trigger.date
      if (group.length < 2 || notes.some((n) => n.lateCall && n.trigger.date.getTime() === at.getTime())) continue
      notes.push({
        identifier: String(notifyId('early', String(at.getTime()))),
        content: { title: 'Did I', body: leftBody(group.length, at), data: { go: '/tonight', left: true } },
        trigger: group[0].trigger,
        earlyCall: true,
        wall: true,
      })
    }
    // Half-done morning: 2 or more morning questions with a reminder still open
    // at 12:00 today make one note. Built from the open set now; every answer re-arms.
    if (reminders && aheads.includes(0) && backOff > 0) {
      const [ny, nm, nd] = today.split('-').map(Number)
      const noon = new Date(ny, nm - 1, nd, 12, 0, 0, 0)
      const openMorning = list.flatMap((book) =>
        countedTonightRows(dueTonight(book, now)).filter((row) => (!row.answer || row.answer.status === 'skip') && !row.lamp.optional && lampBuzzes(row.lamp) && daySection(row.lamp.askAfter) === 'morning'),
      )
      // Quiet hours over noon drop it: pushed to a later hour it would be stale.
      if (openMorning.length >= 2 && noon.getTime() > now.getTime() && afterQuiet(noon).getTime() === noon.getTime()) {
        notes.push({
          identifier: String(notifyId('noon', String(noon.getTime()))),
          content: { title: 'Did I', body: leftBody(openMorning.length, noon), data: { go: '/tonight', left: true } },
          trigger: when(noon),
          wall: true,
          nudge: true,
        })
      }
    }
    // 3 or more question reminders on one minute: one note, opening Today.
    const isAsk = (note) => !note.lateCall && note.content.categoryIdentifier === ASK_CATEGORY && note.content.data?.lampId && !note.content.data?.weId
    for (const group of askGroups(notes, isAsk)) {
      for (const note of group) notes.splice(notes.indexOf(note), 1)
      notes.push({
        identifier: String(notifyId('asks', String(group[0].trigger.date.getTime()))),
        content: { title: 'Did I', body: leftBody(group.length, group[0].trigger.date), data: { go: '/tonight', left: true } },
        trigger: group[0].trigger,
        wall: true,
        group: true,
      })
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
          if (awayOn(night)) continue
          if (night < String(we.startsOn || '') || (we.cadence !== 'monthly' && night === we.skipNight)) continue
          // The weekday of the app day, not the phone calendar.
          const [year, month, date] = night.split('-').map(Number)
          if (Array.isArray(we.nights)) {
            if (!we.nights.includes(night) || night === we.skipNight) continue
          } else {
            if (we.cadence === 'monthly' && !weMonthlyPingDay(night, we.skipNight)) continue
            if (we.cadence === 'weekly' && !(we.weekdays || []).includes(new Date(year, month - 1, date).getDay())) continue
          }
          const at = new Date(year, month - 1, date, Number(match[1]), Number(match[2]), 0, 0)
          if (at.getTime() <= now.getTime()) continue
          // Quiet hours can push it into the next day, when this one is closed.
          if (!nightOpen(night, afterQuiet(at))) continue
          // Entries saved before buddy and others existed keep the question as the body.
          const together = we.others >= 2 ? t('we.startTogetherMany', { n: we.others }) : we.others === 1 && we.buddy ? t('we.startTogether', { name: we.buddy }) : ''
          notes.push({
            identifier: String(notifyId(`we:${we.id}`, night)),
            content: {
              title: 'Did we',
              body: readPrefs().pingsPrivate ? t('pings.privateBody') : together || we.question,
              data: { go: '/tonight', weId: we.id, night },
              categoryIdentifier: ASK_CATEGORY,
            },
            trigger: when(at),
            wall: true,
          })
        }
      }
    }
    // Day nudges at 9:00 and 13:30 while something is still open, kept an
    // hour clear of any question's own reminder. Re-armed on every answer.
    if (pingOn('day')) {
      const reminders = notes.map((note) => note.trigger.date)
      // With the morning ask on, the first one comes at its picked time,
      // asks for today's questions and opens the morning sheet.
      const { morningAsk: morning, morningAt, afternoonAt } = readPrefs()
      const times = [morning ? morningAt || MORNING_AT_DEFAULT : DAY_NUDGE_TIMES[0], afternoonAt || AFTERNOON_AT_DEFAULT]
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      for (const nudge of dayNudges(list, now, { days: (aheads[aheads.length - 1] ?? 0) + 1, reminders, shift: afterQuiet, times })) {
        const dayAhead = Math.round((new Date(nudge.at.getFullYear(), nudge.at.getMonth(), nudge.at.getDate()).getTime() - midnight) / 86400000)
        if (dayAhead >= backOff) continue
        const ask = morning && nudge.slot === 0
        notes.push({
          identifier: String(notifyId('day', nudge.at.toISOString())),
          content: {
            title: 'Did I',
            body: ask ? t('pings.day.morning') : t(`pings.day.${nudge.line}`),
            data: ask ? { go: '/tonight', morning: true } : { go: '/tonight' },
          },
          trigger: when(nudge.at),
          wall: true,
          nudge: true,
        })
      }
    }
    // Over the cap, question reminders keep their slots soonest first; day
    // nudges and last calls only take what is left (capNotes).
    // Waiting Remind me notes count toward the same 64.
    const waitingReminds = readReminds().filter((item) => item.at > Date.now()).length
    const capped = capNotes(notes, PING_CAP - 1 - waitingReminds, Date.now() + CAP_SOON_MS)
    notes.splice(0, notes.length, ...capped.kept)
    const over = capped.over
    let regularCount = notes.length
    // A week away: the last question reminder in the window becomes one gentle
    // push. It is never repeated, and the next open sets reminders fresh.
    const lastAhead = aheads[aheads.length - 1] ?? 0
    // One come-back push and one No rush per gap (the newest real answer day):
    // an open with no answer does not start a second round of them.
    const gap = newestAnswerIso(list, today) || 'none'
    const pushedFor = readComeBackPush()
    const pushedThisGap = pushedFor?.gap === gap && pushedFor.at <= Date.now()
    let comeBackAt = 0
    if (reminders && lastAhead >= 3 && !pushedThisGap) {
      const lastDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + lastAhead)
      const onLastDay = (note) => {
        const d = note.trigger.date
        return d.getFullYear() === lastDay.getFullYear() && d.getMonth() === lastDay.getMonth() && d.getDate() === lastDay.getDate()
      }
      const finals = notes.filter((note) => !note.lateCall && (note.group || note.content.categoryIdentifier === ASK_CATEGORY) && onLastDay(note))
      const final = finals.sort((a, b) => b.trigger.date - a.trigger.date)[0]
      if (final) {
        final.content = { title: t('pings.comeBackTitle'), body: t('pings.comeBackBody'), data: { go: '/tonight' } }
        final.comeBack = true
        comeBackAt = final.trigger.date.getTime()
      }
    }
    if (reminders && notes.length) {
      const last = Math.max(...notes.map((note) => note.trigger.date.getTime()))
      const renewAt = new Date(last + 60 * 1000)
      // when() moves it past quiet hours. Dropped below if the come-back push survives the cap.
      notes.push({
        identifier: String(notifyId('renew', 'pings')),
        content: { title: 'Did I', body: t('pings.renew'), data: { go: '/tonight' } },
        trigger: when(renewAt),
        renew: true,
      })
      // One soft nudge 3 days after that, then nothing (Aaron, 2026-11-03).
      if (!pushedThisGap) notes.push({
        identifier: String(notifyId('renew', 'norush')),
        content: { title: 'Did I', body: t('pings.noRush'), data: { go: '/tonight' } },
        trigger: when(new Date(renewAt.getTime() + 3 * 24 * 60 * 60 * 1000)),
      })
    }
    // Any folder's streak can be at risk, not only the first one's.
    const streakPings = pingOn('streakRisk') && !gentleOn()
    // Gentle mode keeps the 7:00 note: it has no number, and it can still save yesterday.
    const gracePings = pingOn('streakRisk')
    const heat = gracePings ? shelfStreak(list, now) : null
    // A held freeze keeps the streak through a missed day, so the note stays calm.
    // Each at-risk night uses one: the earliest needs 1 held, the next 2, and so on.
    // Gentle mode keeps graceBody, which has no streak talk.
    const freezesHeld = streakPings ? freezeState(list, now).held : 0
    const riskNights = new Set()
    const calmable = []
    // Today and the next day only: with the app closed, the streak a day
    // after that may already be gone, and the note would say it is not.
    for (const ahead of streakPings ? aheads.slice(0, 2) : []) {
      const day = ahead === 0 ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead, 12)
      const risk = list.map((item) => streakRiskFire(item, day, heat)).find(Boolean)
      if (!risk) continue
      riskNights.add(risk.tag.split(':')[1])
      // Quiet hours would move it onto the grace ping. Any note at 21:00 (a last
      // call, a question's own time) already buzzes then: one buzz, not two.
      const riskAt = new Date(risk.at).getTime()
      const lateThen = notes.some((note) => note.trigger.date.getTime() === riskAt)
      if (lateThen || afterQuiet(new Date(risk.at)).getTime() !== riskAt) continue
      const content = {
        title: t('streak.riskTitle'),
        body: t('streak.riskBody', { time: clockWords('09:00') }),
        data: { go: '/tonight', streakRisk: true },
      }
      calmable.push({ night: risk.tag.split(':')[1], content, key: 'streak.heldBody' })
      notes.push({
        identifier: String(notifyId('streak', risk.tag)),
        content,
        trigger: when(new Date(risk.at)),
        wall: true,
      })
    }
    // Before 7am both: this morning's for last night (any folder open then) and tomorrow's.
    // Plus the morning after the next day, so a day the app stays closed still gets one.
    const [ty, tm, td] = today.split('-').map(Number)
    const nextDay = new Date(ty, tm - 1, td + 1, 12)
    const graceFires = [(item) => lastNightGraceFire(item, now, heat), (item) => graceRiskFire(item, now, heat)]
    if (!awayOn(boardDate(nextDay))) graceFires.push((item) => graceRiskFire(item, nextDay, heat))
    const graces = gracePings ? graceFires.map((fire) => list.map(fire).find(Boolean)).filter(Boolean) : []
    for (const grace of graces) {
      riskNights.add(grace.tag.split(':')[1])
      // Quiet hours can push it past 9:00, when the streak can no longer be saved.
      const graceEnd = new Date(grace.at).setHours(9, 0, 0, 0)
      if (afterQuiet(new Date(grace.at)).getTime() >= graceEnd) continue
      const content = {
        title: t('streak.riskTitle'),
        body: t('streak.graceBody', { time: clockWords('09:00') }),
        data: { go: '/tonight', streakRisk: true },
      }
      calmable.push({ night: grace.tag.split(':')[1], content, key: 'streak.heldGraceBody' })
      notes.push({
        identifier: String(notifyId('streak', grace.tag)),
        content,
        trigger: when(new Date(grace.at)),
        wall: true,
      })
    }
    const openGrace = streakPings ? openGraceNight(list, now, heat) : ''
    if (openGrace) riskNights.add(openGrace)
    const calmNights = freezeCalmNights(freezesHeld, riskNights)
    for (const { night, content, key } of calmable) {
      if (calmNights.has(night)) content.body = t(key)
    }
    // A snoozed question answered since then stays quiet.
    const openRows = list.flatMap((book) => dueTonight(book, now).filter((row) => !row.answer || row.answer.status === 'skip'))
    const openNow = new Set(openRows.map((row) => row.lamp.id))
    const pings = readWePings()
    const keepSnoozes = []
    for (const snooze of snoozedNotes()) {
      const data = snooze.content?.data || {}
      if (data.lampId && !openNow.has(data.lampId)) continue
      // Matched on the period too: a Later from yesterday stays quiet once yesterday has a Did.
      if (data.lampId && data.night && !data.weId && list.some((book) => (book.answers || []).some((a) => a.lampId === data.lampId && a.periodKey === data.night && (a.status === 'yes' || a.status === 'late')))) continue
      if (data.lampId && !data.weId && /^\d{4}-\d{2}-\d{2}$/.test(data.night || '') && !nightOpen(data.night, afterQuiet(new Date(snooze.at)))) continue
      if (data.weId && data.night && (weNightStatus(data.night, data.weId) === 'did' || pings.some((ping) => ping.id === data.weId && ping.skipNight === data.night))) continue
      keepSnoozes.push(snooze)
      // Its own reminder or a streak note on the same minute goes: one buzz.
      const snoozeAt = afterQuiet(new Date(snooze.at)).getTime()
      for (let i = notes.length - 1; i >= 0; i -= 1) {
        if (!laterClash(notes[i], data, snoozeAt)) continue
        notes.splice(i, 1)
        if (i < regularCount) regularCount -= 1
      }
      notes.push({
        identifier: snooze.identifier,
        content: snooze.content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: afterQuiet(new Date(snooze.at)), channelId: CHANNEL_ID },
      })
    }
    try {
      localStorage.setItem(SNOOZE_KEY, JSON.stringify(keepSnoozes))
    } catch {
      // ok
    }
    // iOS keeps 64 and drops the last to fire (renew, no rush), so extras push out the latest regular notes.
    const spill = notes.length - (PING_CAP - waitingReminds)
    if (spill > 0) notes.splice(Math.max(0, regularCount - spill), spill)
    // The come-back push, once it is sure to be set, says it all: no renew a
    // minute later. Cut by the cap, nothing is marked as sent for this gap.
    if (notes.some((note) => note.comeBack)) {
      const renew = notes.findIndex((note) => note.renew)
      if (renew >= 0) notes.splice(renew, 1)
      saveComeBackPush(gap, comeBackAt)
    } else if (!pushedThisGap) {
      saveComeBackPush('', 0)
    }
    // Cleared only once the new list is built: a throw above keeps the old ones.
    await cancelStale(Notifications, notes)
    await scheduleReminds(Notifications)
    let failed = 0
    for (const note of notes) {
      // A time already past is not a failure; it would never fire.
      const at = note.trigger?.date
      if (at instanceof Date && at.getTime() <= Date.now()) continue
      try {
        await Notifications.scheduleNotificationAsync({ identifier: note.identifier, content: note.content, trigger: note.wall && Platform.OS === 'ios' ? wallTrigger(note.trigger) : note.trigger })
      } catch {
        // Some ROMs block exact alarms.
        failed += 1
      }
    }
    await dismissStale(Notifications, list, now, openRows)
    // Saved only once all are set, so a run cut short or a failed note is tried again on the next open.
    try {
      if (failed) {
        localStorage.setItem(PING_FAILED_KEY, '1')
      } else {
        localStorage.setItem(PING_ZONE_KEY, pingZone())
        localStorage.setItem(PING_AT_KEY, String(Date.now()))
        localStorage.removeItem(PING_FAILED_KEY)
      }
    } catch {
      // ok
    }
  } catch {
    // Notifications native module not ready or misconfigured.
    try {
      localStorage.setItem(PING_FAILED_KEY, '1')
    } catch {
      // ok
    }
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

const feel = makeFeelTap({ Haptics, android, thresholdModule, on: () => readPrefs().vibrate !== false })

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
  return Share.share({ title: 'Did I', message: text })
}

// The backup as a real dated .json file in the share sheet. False when this
// binary has no file module or sharing, so the caller hides the row.
export function backupFileReady() {
  return typeof FileSystem.File === 'function' && Boolean(FileSystem.Paths) && typeof Sharing.shareAsync === 'function'
}

export async function shareBackupFile(shelf) {
  if (!backupFileReady() || !(await Sharing.isAvailableAsync())) throw new Error('share-unavailable')
  const file = new FileSystem.File(FileSystem.Paths.cache, `did-i-backup-${boardDate(new Date(), 4)}.json`)
  if (file.exists) file.delete()
  file.create()
  file.write(JSON.stringify(shelf, null, 2))
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Did I', UTI: 'public.json' })
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
