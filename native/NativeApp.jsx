import { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { currentBook, readShelf, writeShelf } from '../src/lib/board-shelf.js'
import { bootNative, listenNativeShell } from '../src/lib/native.js'
import { preparePush } from '../src/lib/push.js'
import { useTheme } from '../src/lib/prefs.js'
import { needsEnter } from '../src/lib/session.js'
import { runAfterLaunchReady } from './lib/launch-ready.js'
import { afterNativeBridgeReady } from './lib/defer-native.js'
import { nativeWidgetsEnabled } from './lib/widgets-enabled.js'
import { initWidgetsOnLaunch } from './widget-bridge.js'
import { syncTonightWidget } from './widget-sync.js'
import { listenForWatchTaps, resendWatchCards } from './watch-sync.js'
import { installQuickActions } from './quick-actions.js'
import { refreshTogether } from '../src/lib/people.js'
import { t, tMiss } from '../src/lib/i18n.js'
import { showToast } from './lib/toast-queue.js'
import { applyWidgetTapOnce, publishShelf } from '../src/lib/widget-tonight.js'
import { addMorning } from '../src/lib/morning-ask.js'
import { commitBook } from '../src/lib/achievements.js'
import { REMIND_AGAIN_MIN, REMIND_TRIES, readReminds, remindNext, restoreRemind } from '../src/lib/remind-me.js'

// Did or Not yet on a Remind me note. Did clears it. Not yet asks again in 15
// minutes; the last one becomes a one-day question on Today.
async function answerRemind(id, action) {
  const item = readReminds().find((one) => one.id === id)
  if (!item) return
  await cancelRemind(item)
  const out = remindNext(item, action === 'did' ? 'did' : 'nope')
  if (out.item) {
    const set = await scheduleRemind(out.item)
    if (set.miss) showToast({ id: 'remind', kind: 'error', text: t(set.miss), ms: 5200 })
    return
  }
  if (!out.toToday) return
  const shelf = readShelf()
  const book = currentBook(shelf)
  const added = book ? addMorning(book, shelf.boards, item.text, new Date()) : { error: 'empty' }
  if (added.error && added.error !== 'dupe' && added.error !== 'full') {
    // Nothing to retry (no folder, empty text): drop it and say so.
    showToast({ id: 'remind', kind: 'error', text: t('noteAnswer.notSaved'), ms: 5200 })
    return
  }
  if (added.error === 'full') {
    // Today is full: keep it and ask once more rather than lose it.
    const again = { ...item, tries: REMIND_TRIES - 1, at: Date.now() + REMIND_AGAIN_MIN * 60 * 1000 }
    restoreRemind(again)
    scheduleRemind(again).catch(() => {})
    showToast({ id: 'remind', kind: 'error', text: t('noteAnswer.notSaved'), ms: 5200 })
    return
  }
  if (added.book) {
    const next = writeShelf({ ...shelf, boards: shelf.boards.map((one) => (one.id === added.book.id ? commitBook(added.book, new Date()) : one)) })
    publishShelf(next)
    if (nativeWidgetsEnabled()) syncTonightWidget(next).catch(() => {})
    armNativePingsNow(next.boards || []).catch(() => {})
  }
  showToast({ id: 'remind', text: t('remind.toToday'), ms: 3200 })
}

// Did on a second reminder for a question already Did: nothing was lost.
function alreadySaid(lampId, kind, night) {
  const want = kind === 'did' ? ['yes', 'late'] : ['skip']
  return (readShelf()?.boards || []).some((book) =>
    (book.answers || []).some((answer) => answer.lampId === lampId && (!night || answer.periodKey === night) && want.includes(answer.status)),
  )
}
import { armNativePingsNow, cancelRemind, scheduleRemind } from './shim/native.js'
import { onSocialLive } from '../src/lib/social-live.js'
import { hallColors } from './palette.js'
import { BootView } from './components/BootView.jsx'
import { Boundary } from './components/Boundary.jsx'
import { Slot } from './components/Slot.jsx'
import { StreakMomentHost } from './components/StreakMoment.jsx'
import { RootNavigator } from './navigation/RootNavigator.jsx'
import { goBack, goFromPush, goHash } from './navigation/hash.js'
import { useAppFonts } from './useAppFonts.js'

SplashScreen.preventAutoHideAsync().catch(() => {})

// Dark icons on Light, light icons on Dark; Phone resolves to whichever the
// phone is using. The app draws edge to edge, so there is no bar color.
function ThemedStatusBar() {
  const theme = useTheme()
  return <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
}

const wideColumn = { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' }

export function NativeApp() {
  const theme = useTheme()
  const fontsLoaded = useAppFonts()
  const [launchReady, setLaunchReady] = useState(false)

  useEffect(() => {
    if (!fontsLoaded) return undefined
    let alive = true
    runAfterLaunchReady(() => {
      if (alive) setLaunchReady(true)
    })
    return () => {
      alive = false
    }
  }, [fontsLoaded])

  useEffect(() => {
    if (!launchReady) return undefined
    SplashScreen.hideAsync().catch(() => {})
    bootNative()
    const stop = listenNativeShell({
      onBack() {
        const shelf = readShelf()
        const book = currentBook(shelf)
        // Every folder, not only the open one.
        const empty = shelf.boards.every((item) => (item.lamps || []).filter((lamp) => !lamp.archived).length === 0)
        return goBack({ emptyHall: empty, needsEnter: needsEnter(book) })
      },
      onOpenLamp(lampId) {
        goHash('/tonight', lampId ? { face: lampId, tag: 'all' } : '')
      },
    })
    let alive = true
    let stopWatch = () => {}
    let offLive = () => {}
    afterNativeBridgeReady(async () => {
      installQuickActions()
      // Did or Not yet on the watch: saved like a widget tap, then the watch
      // gets the cards again (also when the phone said no). Listening first,
      // so a tap made during launch is not missed. No watch module: a no-op.
      if (alive) {
        stopWatch = listenForWatchTaps((tap) => {
          const shelf = applyWidgetTapOnce(tap?.id, tap?.answer, tap?.night || '', new Date(), Number(tap?.at) || Date.now())
          // Shelf not loaded yet at launch: keep the tap for the retry list.
          if (!shelf && !(readShelf().boards || []).length) throw new Error('shelf not loaded')
          resendWatchCards()
          syncTonightWidget(shelf || readShelf()).catch(() => {})
          // Now, as for reminder buttons: iOS may suspend the wake before the debounce.
          if (shelf) armNativePingsNow(shelf.boards || []).catch(() => {})
        }, async () => {
          // Wear OS: the tap is already in the widget tap queue (WatchTapService).
          const { applyPendingAndroidWidgetTap } = await import('./widget-tap.android.js')
          const shelf = await applyPendingAndroidWidgetTap()
          resendWatchCards()
          syncTonightWidget(shelf || readShelf()).catch(() => {})
        })
      }
      // Before widget init: a slow or failing init must not drop the reminder
      // tap that launched the app.
      preparePush({
        onGo: (where) => goFromPush(where),
        onLamp: (lampId) => goHash('/tonight', lampId ? { face: lampId, tag: 'all' } : ''),
        // Keep or Pass on a friend's did you: the inbox answers it.
        onSend: (sendId, keep) => goHash('/inbox', { id: `${keep ? 'keep' : 'pass'}:${sendId}` }),
        onRemind: (id, action) => {
          answerRemind(id, action).catch(() => {})
        },
        // Did or Nope from a reminder: saved the same way as a widget tap,
        // without opening Tonight. A night that has turned or an answer that
        // is already set (the undo and lock rules) is not changed.
        onAnswer: (lampId, kind, night, at) => {
          const shelf = applyWidgetTapOnce(lampId, kind, night, new Date(), at || Date.now())
          if (shelf && nativeWidgetsEnabled()) syncTonightWidget(shelf).catch(() => {})
          // Now, not after the debounce: iOS may suspend a background wake first,
          // and that question's later reminders would still go off.
          if (shelf) armNativePingsNow(shelf.boards || []).catch(() => {})
          if (!shelf && !alreadySaid(lampId, kind, night)) showToast({ id: 'note-answer', kind: 'error', text: t('noteAnswer.notSaved'), ms: 5200 })
        },
        // Did or Nope on a Did we reminder: saved on the server. A miss
        // (offline, card left) says so on the next look at the app.
        onWeAnswer: async (cardId, kind, night) => {
          try {
            const { knownWeCard, weAnswer } = await import('../src/lib/did-we.js')
            const { weMissKey } = await import('../src/lib/we-look.js')
            const out = await weAnswer(cardId, kind, night || undefined)
            // A weekly card's closed slot says week; unknown cards keep the day line.
            const miss = knownWeCard(cardId) ? weMissKey(knownWeCard(cardId), out.miss) : out.miss
            if (out.miss) showToast({ id: 'we-answer', kind: 'error', text: tMiss(miss), ms: 5200 })
            else if (kind === 'did') {
              const { skipWePing } = await import('../src/lib/we-widget.js')
              const { boardDate } = await import('../src/lib/recurrence.js')
              if (skipWePing(cardId, night || boardDate())) armNativePingsNow(readShelf()?.boards || []).catch(() => {})
            }
          } catch {
            showToast({ id: 'we-answer', kind: 'error', text: t('people.reach'), ms: 5200 })
          }
        },
      }).catch(() => {})
      if (nativeWidgetsEnabled()) {
        // Who is done tonight, for the Together widget, on open and on return.
        refreshTogether().catch(() => {})
        globalThis.__didIOnVisible?.(() => refreshTogether().catch(() => {}))
        // Someone you are with answered while the app is open.
        offLive = onSocialLive(() => refreshTogether().catch(() => {}))
        await initWidgetsOnLaunch(readShelf()).catch(() => {})
      }
    })
    return () => {
      alive = false
      stop?.()
      stopWatch()
      offLive()
    }
  }, [launchReady])

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: hallColors('lime', theme).bg }}>
      {!fontsLoaded || !launchReady ? (
        <BootView />
      ) : (
        <SafeAreaProvider>
          <ThemedStatusBar />
          <Boundary>
            {/* Phones are narrower than this; the open iPhone Duo and other wide screens get a centered column. */}
            <View style={wideColumn}>
              <RootNavigator />
            </View>
            <Slot>
              <StreakMomentHost />
            </Slot>
          </Boundary>
        </SafeAreaProvider>
      )}
    </GestureHandlerRootView>
  )
}
