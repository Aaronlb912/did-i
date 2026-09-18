import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Share } from '@capacitor/share'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { boardDate, waitingTonight } from './recurrence.js'

export function isNativeHall() {
  return Capacitor.isNativePlatform()
}

function reduceMotion() {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export async function bootNative() {
  if (!isNativeHall()) return
  try {
    await StatusBar.setBackgroundColor({ color: '#1c1410' })
    await StatusBar.setStyle({ style: Style.Dark })
  } catch {
    // WebView still paints the hall.
  }
  try {
    await SplashScreen.hide()
  } catch {
    // Splash may already be gone.
  }
}

export async function checkNativePings() {
  if (!isNativeHall()) return null
  try {
    const { display } = await LocalNotifications.checkPermissions()
    if (display === 'granted') return 'granted'
    if (display === 'denied') return 'denied'
    return 'default'
  } catch {
    return 'missing'
  }
}

export async function requestNativePings() {
  if (!isNativeHall()) return null
  try {
    const { display } = await LocalNotifications.requestPermissions()
    if (display === 'granted') return 'granted'
    if (display === 'denied') return 'denied'
    return 'default'
  } catch {
    return 'denied'
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

export async function scheduleNativePings(book, now = new Date()) {
  if (!isNativeHall() || !book) return
  const allowed = await checkNativePings()
  if (allowed !== 'granted') return
  try {
    const pending = await LocalNotifications.getPending()
    if (pending.notifications && pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications })
    }
  } catch {
    // Fresh install has none.
  }
  const dateIso = boardDate(now, book.dayFoldHour)
  const [year, month, day] = dateIso.split('-').map(Number)
  const notes = []
  for (const row of waitingTonight(book, now)) {
    const match = String(row.lamp.askAfter || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/)
    if (!match) continue
    const at = new Date(year, month - 1, day, Number(match[1]), Number(match[2]), 0, 0)
    if (at.getTime() <= now.getTime()) continue
    notes.push({
      id: notifyId(row.lamp.id, row.periodKey),
      title: 'Did I',
      body: row.lamp.question,
      schedule: { at, allowWhileIdle: true },
      extra: { lampId: row.lamp.id, url: '#/' },
    })
  }
  if (!notes.length) return
  try {
    await LocalNotifications.schedule({ notifications: notes })
  } catch {
    // Some ROMs block exact alarms until the user allows it.
  }
}

export async function feelTap(kind) {
  if (reduceMotion()) return
  try {
    if (kind === 'skip') {
      await Haptics.impact({ style: ImpactStyle.Light })
      return
    }
    if (kind === 'hall-on') {
      await Haptics.notification({ type: NotificationType.Success })
      return
    }
    await Haptics.impact({ style: ImpactStyle.Heavy })
  } catch {
    // Browser has no motor.
  }
}

export function playClick() {
  if (reduceMotion()) return
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = 190
    gain.gain.setValueAtTime(0.05, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.045)
    window.setTimeout(() => ctx.close(), 80)
  } catch {
    // No audio.
  }
}

export async function shareBook(book) {
  const stamp = boardDate(new Date(), book.dayFoldHour)
  const slug =
    String(book.title || 'hall')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'hall'
  const text = JSON.stringify(book, null, 2)
  if (isNativeHall()) {
    await Share.share({
      title: book.title || 'Did I',
      text,
      dialogTitle: `${slug}-${stamp}.json`,
    })
    return
  }
  const blob = new Blob([text], { type: 'application/json' })
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], `${slug}-${stamp}.json`, { type: 'application/json' })
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: book.title || 'Did I' })
      return
    }
  }
  throw new Error('share-unavailable')
}

export function listenNativeShell({ onBack, onOpenLamp }) {
  if (!isNativeHall()) return () => {}
  let handles = []
  let dead = false
  Promise.all([
    App.addListener('backButton', () => {
      onBack()
    }),
    App.addListener('appUrlOpen', (event) => {
      const lampId = lampFromUrl(event.url)
      onOpenLamp(lampId || '')
    }),
    LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      const lampId = event.notification?.extra?.lampId || ''
      onOpenLamp(lampId)
    }),
  ]).then((list) => {
    if (dead) {
      list.forEach((handle) => handle.remove())
      return
    }
    handles = list
  })
  return () => {
    dead = true
    handles.forEach((handle) => handle.remove())
  }
}

function lampFromUrl(url) {
  try {
    const hash = String(url).split('#')[1] || ''
    const q = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''
    return new URLSearchParams(q).get('face') || ''
  } catch {
    return ''
  }
}
