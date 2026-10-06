import { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { currentBook, readShelf } from '../src/lib/board-shelf.js'
import { bootNative, listenNativeShell } from '../src/lib/native.js'
import { preparePush } from '../src/lib/push.js'
import { useTheme } from '../src/lib/prefs.js'
import { needsEnter } from '../src/lib/session.js'
import { runAfterLaunchReady } from './lib/launch-ready.js'
import { afterNativeBridgeReady } from './lib/defer-native.js'
import { nativeWidgetsEnabled } from './lib/widgets-enabled.js'
import { initWidgetsOnLaunch } from './widget-bridge.js'
import { syncTonightWidget } from './widget-sync.js'
import { installQuickActions } from './quick-actions.js'
import { refreshTogether } from '../src/lib/people.js'
import { t, tMiss } from '../src/lib/i18n.js'
import { showToast } from './lib/toast-queue.js'
import { applyWidgetTapOnce } from '../src/lib/widget-tonight.js'
import { Boundary } from './components/Boundary.jsx'
import { Slot } from './components/Slot.jsx'
import { StreakMomentHost } from './components/StreakMoment.jsx'
import { PendingScanHost } from './components/PendingScanHost.jsx'
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

export function NativeApp() {
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
        const empty = (book?.lamps || []).filter((lamp) => !lamp.archived).length === 0
        return goBack({ emptyHall: empty, needsEnter: needsEnter(book) })
      },
      onOpenLamp(lampId) {
        goHash('/tonight', lampId ? { face: lampId, tag: 'all' } : '')
      },
    })
    afterNativeBridgeReady(async () => {
      installQuickActions()
      if (nativeWidgetsEnabled()) {
        // Who is done tonight, for the Together widget, on open and on return.
        refreshTogether().catch(() => {})
        globalThis.__didIOnVisible?.(() => refreshTogether().catch(() => {}))
        await initWidgetsOnLaunch(readShelf()).catch(() => {})
      }
      preparePush({
        onGo: (where) => goFromPush(where),
        onLamp: (lampId) => goHash('/tonight', lampId ? { face: lampId, tag: 'all' } : ''),
        // Keep or Pass on a friend's did you: the inbox answers it.
        onSend: (sendId, keep) => goHash('/inbox', { id: `${keep ? 'keep' : 'pass'}:${sendId}` }),
        // Did or Nope from a reminder: saved the same way as a widget tap,
        // without opening Tonight. A night that has turned or an answer that
        // is already set (the undo and lock rules) is not changed.
        onAnswer: (lampId, kind, night, at) => {
          const shelf = applyWidgetTapOnce(lampId, kind, night, new Date(), at || Date.now())
          if (shelf && nativeWidgetsEnabled()) syncTonightWidget(shelf).catch(() => {})
          if (!shelf) showToast({ id: 'note-answer', kind: 'error', text: t('noteAnswer.notSaved'), ms: 5200 })
        },
        // Did or Nope on a Did we reminder: saved on the server. A miss
        // (offline, card left) says so on the next look at the app.
        onWeAnswer: async (cardId, kind, night) => {
          try {
            const { weAnswer } = await import('../src/lib/did-we.js')
            const out = await weAnswer(cardId, kind, night || undefined)
            if (out.miss) showToast({ id: 'we-answer', kind: 'error', text: tMiss(out.miss), ms: 5200 })
          } catch {
            showToast({ id: 'we-answer', kind: 'error', text: t('people.reach'), ms: 5200 })
          }
        },
      }).catch(() => {})
    })
    return stop
  }, [launchReady])

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0e1014' }}>
      {!fontsLoaded || !launchReady ? null : (
        <SafeAreaProvider>
          <ThemedStatusBar />
          <Boundary>
            <RootNavigator />
            <PendingScanHost />
            <Slot>
              <StreakMomentHost />
            </Slot>
          </Boundary>
        </SafeAreaProvider>
      )}
    </GestureHandlerRootView>
  )
}
