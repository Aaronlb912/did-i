import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import * as Linking from 'expo-linking'
import * as Notifications from 'expo-notifications'
import * as SplashScreen from 'expo-splash-screen'
import { AppState, BackHandler, Platform, Share, StatusBar } from 'react-native'
import { lampNotifyOn } from '../../src/lib/board-json.js'
import { t } from '../../src/lib/i18n.js'
import { boardDate, waitingTonight } from '../../src/lib/recurrence.js'
import { setAppForeground } from '../../src/lib/app-foreground.js'
import { streakRiskFire } from '../../src/lib/streak-risk.js'
import { readReduceMotion } from '../../src/lib/useReduceMotion.js'
import { goFromPush, goHash } from '../navigation/hash.js'
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

export async function pingStreakHit(hit, dateIso) {
  if (!hit) return false
  const allowed = await checkNativePings()
  if (allowed !== 'granted') return false
  try {
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
    const { status } = await Notifications.getPermissionsAsync()
    if (status === 'granted') return 'granted'
    if (status === 'denied') return 'denied'
    return 'default'
  } catch {
    return 'missing'
  }
}

export async function requestNativePings() {
  try {
    const { status } = await Notifications.requestPermissionsAsync()
    if (status === 'granted') return 'granted'
    if (status === 'denied') return 'denied'
    return 'default'
  } catch {
    return 'denied'
  }
}

export async function scheduleNativePings(book, now = new Date()) {
  if (!book) return
  const allowed = await checkNativePings()
  if (allowed !== 'granted') return
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
  } catch {
    // ok
  }
  const dateIso = boardDate(now)
  const [year, month, day] = dateIso.split('-').map(Number)
  const notes = []
  for (const row of waitingTonight(book, now)) {
    if (!lampNotifyOn(row.lamp)) continue
    const match = String(row.lamp.askAfter || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/)
    if (!match) continue
    const at = new Date(year, month - 1, day, Number(match[1]), Number(match[2]), 0, 0)
    if (at.getTime() <= now.getTime()) continue
    notes.push({
      identifier: String(notifyId(row.lamp.id, row.periodKey)),
      content: {
        title: 'Did I',
        body: row.lamp.question,
        data: { lampId: row.lamp.id, go: '/tonight' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    })
  }
  const risk = streakRiskFire(book, now)
  if (risk) {
    notes.push({
      identifier: String(notifyId('streak', risk.tag)),
      content: {
        title: t('streak.riskTitle'),
        body: t('streak.riskBody'),
        data: { go: '/tonight', streakRisk: true },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(risk.at) },
    })
  }
  for (const note of notes) {
    try {
      await Notifications.scheduleNotificationAsync(note)
    } catch {
      // Some ROMs block exact alarms.
    }
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
  try {
    const parsed = Linking.parse(url)
    const lampId = parsed?.queryParams?.id || parsed?.queryParams?.face || ''
    return String(lampId || '')
  } catch {
    return ''
  }
}

export function listenNativeShell({ onBack, onOpenLamp }) {
  const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
    onBack?.()
    return true
  })
  const linkSub = Linking.addEventListener('url', ({ url }) => {
    const lampId = lampFromUrl(url)
    onOpenLamp?.(lampId || '')
  })
  const noteSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const lampId = response?.notification?.request?.content?.data?.lampId || ''
    const go = response?.notification?.request?.content?.data?.go || ''
    if (lampId) onOpenLamp?.(String(lampId))
    else if (go) goFromPush(String(go))
  })
  Linking.getInitialURL()
    .then((url) => {
      if (!url) return
      const lampId = lampFromUrl(url)
      if (lampId) onOpenLamp?.(lampId)
    })
    .catch(() => {})
  return () => {
    backSub.remove()
    linkSub.remove()
    noteSub.remove()
  }
}
