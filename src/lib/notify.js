import { lampBuzzes, lampNudgesLate } from './board-json.js'
import { clockWords } from './hall-pages.js'
import { t } from './i18n.js'
import { boardDate, dueTonight, waitingTonight } from './recurrence.js'
import { checkNativePings, isNativeHall, requestNativePings, scheduleNativePings } from './native.js'
import { afterQuiet, gentleOn, pingOn, readPrefs } from './prefs.js'
import { savePrefsForSw } from './board-store.js'
import { streakRiskFire } from './streak-risk.js'
import { shelfStreak } from './hall-feel.js'

const timers = []

export function pingSupport() {
  if (isNativeHall()) return 'default'
  if (typeof window === 'undefined' || !('Notification' in window)) return 'missing'
  return Notification.permission
}

export async function checkPings() {
  const native = await checkNativePings()
  if (native) return native
  return pingSupport()
}

export async function requestPings() {
  const native = await requestNativePings()
  if (native) return native
  if (!('Notification' in window)) return 'missing'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

// The last call of the night for a high one that is still open.
const LATE_NUDGE_HOUR = 21

// Takes one board or every board. Low priority questions stay quiet
// (lampBuzzes). Tags are per question and night, so two questions do not
// replace each other's notification.
export function upcomingPings(book, now = new Date()) {
  if (!book) return []
  const dateIso = boardDate(now)
  const [year, month, day] = dateIso.split('-').map(Number)
  const fires = []
  const books = Array.isArray(book) ? book.filter((one) => one && !one.archived) : [book]
  // Every open row, so a re-arm after the ask time still keeps the 21:00
  // late note. The ask note itself only goes to rows still waiting. Not yet
  // (status skip) is not done, so it keeps the late note too.
  const rows = books.flatMap((one) => dueTonight(one, now)).filter((row) => !row.answer || row.answer.status === 'skip')
  const waiting = new Set(books.flatMap((one) => waitingTonight(one, now)).map((row) => `${row.lamp.id}:${row.periodKey}`))
  for (const row of rows) {
    if (!lampBuzzes(row.lamp)) continue
    // No time set: no ask note, but a high one still gets the late note.
    const match = String(row.lamp.askAfter || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/)
    const at = match ? new Date(year, month - 1, day, Number(match[1]), Number(match[2]), 0, 0) : null
    if (at && !row.answer && at.getTime() > now.getTime() && waiting.has(`${row.lamp.id}:${row.periodKey}`)) {
      fires.push({
        id: row.lamp.id,
        tag: `${row.lamp.id}:${row.periodKey}`,
        question: String(row.lamp.question ?? ''),
        at: at.getTime(),
      })
    }
    if (!lampNudgesLate(row.lamp)) continue
    const late = new Date(year, month - 1, day, LATE_NUDGE_HOUR, 0, 0, 0)
    if (late.getTime() <= now.getTime() || (at && late.getTime() <= at.getTime())) continue
    // Quiet hours would push it to morning, which is no last call.
    if (afterQuiet(late).getTime() !== late.getTime()) continue
    fires.push({
      id: row.lamp.id,
      tag: `${row.lamp.id}:${row.periodKey}:late`,
      question: String(row.lamp.question ?? ''),
      at: late.getTime(),
    })
  }
  return fires
}

async function readyWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

function showPing(reg, fire) {
  const opts = {
    body: fire.question,
    tag: fire.tag,
    icon: './icon-192.png',
    data: { url: `./#/?face=${encodeURIComponent(fire.id)}`, lampId: fire.id },
  }
  if (reg && reg.showNotification) return reg.showNotification('Did I', opts)
  return new Notification('Did I', opts)
}

export async function armLampPings(book, now = new Date()) {
  for (const id of timers) window.clearTimeout(id)
  timers.length = 0
  await scheduleNativePings(book, now)
  const allowed = isNativeHall() ? (await checkNativePings()) === 'granted' : pingSupport() === 'granted'
  if (!book || !allowed) return
  if (isNativeHall()) return
  savePrefsForSw(readPrefs())
  const reg = await readyWorker()
  const fires = pingOn('reminders') ? [...upcomingPings(book, now)] : []
  const risk = pingOn('streakRisk') && !gentleOn() ? streakRiskFire(book, now, shelfStreak([book], now)) : null
  if (risk) {
    fires.push({ ...risk, question: t('streak.riskBody', { time: clockWords('09:00') }) })
  }
  for (const fire of fires) {
    const delay = afterQuiet(new Date(fire.at)).getTime() - now.getTime()
    if (delay <= 0 || delay > 36 * 60 * 60 * 1000) continue
    const id = window.setTimeout(() => {
      showPing(reg, fire)
    }, delay)
    timers.push(id)
  }
  try {
    if (reg && 'periodicSync' in reg) {
      await reg.periodicSync.register('did-i-lamps', { minInterval: 60 * 60 * 1000 })
    }
  } catch {
    // Only some installed Chromium builds allow this.
  }
}

export function pingButtonLabel(state) {
  if (state === 'missing') return ''
  if (state === 'granted') return 'pings.state.on'
  if (state === 'denied') return 'pings.state.blocked'
  return 'pings.state.ask'
}
