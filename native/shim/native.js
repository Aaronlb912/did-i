import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import * as Linking from 'expo-linking'
import * as SplashScreen from 'expo-splash-screen'
import { AppState, BackHandler, Platform, Share, StatusBar } from 'react-native'
import { lampNotifyOn } from '../../src/lib/board-json.js'
import { t } from '../../src/lib/i18n.js'
import { pingOn } from '../../src/lib/prefs.js'
import { boardDate, dueTonight, waitingTonight } from '../../src/lib/recurrence.js'
import { setAppForeground } from '../../src/lib/app-foreground.js'
import { streakRiskFire } from '../../src/lib/streak-risk.js'
import { readReduceMotion } from '../../src/lib/useReduceMotion.js'
import { goFromDeepLink, routeFromDeepLink } from '../deep-link.js'
import { goHash } from '../navigation/hash.js'
export function isNativeHall() {
  return true
}

export function isAppForeground() {
  return AppState.currentState === 'active'
}

function reduceMotion() {
  return readReduceMotion()
}

export async function bootNative() {
  try {
    StatusBar.setBarStyle('light-content')
    if (Platform.OS === 'android') StatusBar.setBackgroundColor('#0e1014')
  } catch {
    // ok
  }
  setAppForeground(AppState.currentState === 'active')
  AppState.addEventListener('change', (next) => {
    setAppForeground(next === 'active')
  })
}

async function notifications() {
  return import('expo-notifications')
}

export async function pingStreakHit(hit, dateIso) {
  if (!hit || !pingOn('streakHit')) return false
  const allowed = await checkNativePings()
  if (allowed !== 'granted') return false
  try {
    const Notifications = await notifications()
    await Notifications.scheduleNotificationAsync({
      identifier: String(notifyId('streak-hit', dateIso)),
      content: {
        title: t('streak.hitTitle'),
        body: t('streak.hitBody', { n: hit.n }),
        data: { go: '/tonight', streakHit: true },
      },
      trigger: null,
    })
    return true
  } catch {
    return false
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

// Takes one board or every board on the shelf; each tag's questions ping.
export async function scheduleNativePings(books, now = new Date()) {
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
    const when = (at) => ({
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: at,
      channelId: CHANNEL_ID,
    })
    const notes = []
    const reminders = pingOn('reminders')
    for (const book of list) {
      for (let ahead = 0; ahead < PING_DAYS; ahead += 1) {
        // Midday of that calendar day sits inside the right board night.
        const day = ahead === 0 ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead, 12)
        const rows = ahead === 0 ? waitingTonight(book, now) : dueTonight(book, day).filter((row) => !row.answer)
        const [year, month, date] = boardDate(day).split('-').map(Number)
        for (const row of rows) {
          if (!reminders || !lampNotifyOn(row.lamp)) continue
          const match = String(row.lamp.askAfter || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/)
          if (!match) continue
          const at = new Date(year, month - 1, date, Number(match[1]), Number(match[2]), 0, 0)
          if (at.getTime() <= now.getTime()) continue
          notes.push({
            identifier: String(notifyId(row.lamp.id, row.periodKey)),
            content: {
              title: 'Did I',
              body: row.lamp.question,
              data: { lampId: row.lamp.id, go: '/tonight' },
            },
            trigger: when(at),
          })
        }
      }
    }
    notes.sort((a, b) => a.trigger.date - b.trigger.date)
    notes.length = Math.min(notes.length, PING_CAP)
    const book = list[0]
    const risk = pingOn('streakRisk') ? streakRiskFire(book, now) : null
    if (risk) {
      notes.push({
        identifier: String(notifyId('streak', risk.tag)),
        content: {
          title: t('streak.riskTitle'),
          body: t('streak.riskBody'),
          data: { go: '/tonight', streakRisk: true },
        },
        trigger: when(new Date(risk.at)),
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

export function feelTap(kind) {
  if (reduceMotion()) return
  if (kind === 'skip') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    return
  }
  if (kind === 'hall-on') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    return
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {})
}

export function playClick() {
  if (reduceMotion()) return
  Haptics.selectionAsync().catch(() => {})
}

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

export async function shareShelf(shelf) {
  const stamp = boardDate(new Date(), 4)
  const text = JSON.stringify(shelf, null, 2)
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
  const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
    onBack?.()
    return true
  })
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
