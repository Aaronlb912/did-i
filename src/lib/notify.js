import { boardDate, waitingTonight } from './recurrence.js'
import { checkNativePings, isNativeHall, requestNativePings, scheduleNativePings } from './native.js'

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

export function upcomingPings(book, now = new Date()) {
  if (!book) return []
  const dateIso = boardDate(now, book.dayFoldHour)
  const [year, month, day] = dateIso.split('-').map(Number)
  const fires = []
  for (const row of waitingTonight(book, now)) {
    const match = String(row.lamp.askAfter || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/)
    if (!match) continue
    const at = new Date(year, month - 1, day, Number(match[1]), Number(match[2]), 0, 0)
    if (at.getTime() <= now.getTime()) continue
    fires.push({
      id: row.lamp.id,
      tag: row.periodKey,
      question: row.lamp.question,
      at: at.getTime(),
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
  const reg = await readyWorker()
  const fires = upcomingPings(book, now)
  for (const fire of fires) {
    const delay = fire.at - now.getTime()
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
  if (state === 'granted') return 'Pings on'
  if (state === 'denied') return 'Pings blocked'
  return 'Ask at lamp time'
}
