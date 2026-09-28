import { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { currentBook, readShelf } from '../src/lib/board-shelf.js'
import { bootNative, listenNativeShell } from '../src/lib/native.js'
import { preparePush } from '../src/lib/push.js'
import { needsEnter } from '../src/lib/session.js'
import { runAfterLaunchReady } from './lib/launch-ready.js'
import { afterNativeBridgeReady } from './lib/defer-native.js'
import { nativeWidgetsEnabled } from './lib/widgets-enabled.js'
import { initWidgetsOnLaunch } from './widget-bridge.js'
import { Boundary } from './components/Boundary.jsx'
import { Slot } from './components/Slot.jsx'
import { DiagnosticsAsk } from './components/DiagnosticsAsk.jsx'
import { StreakMomentHost } from './components/StreakMoment.jsx'
import { RootNavigator } from './navigation/RootNavigator.jsx'
import { goBack, goFromPush, goHash } from './navigation/hash.js'
import { useAppFonts } from './useAppFonts.js'

SplashScreen.preventAutoHideAsync().catch(() => {})

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
        goHash('/tonight', lampId ? { face: lampId } : '')
      },
    })
    afterNativeBridgeReady(async () => {
      if (nativeWidgetsEnabled()) {
        await initWidgetsOnLaunch(readShelf()).catch(() => {})
      }
      preparePush({
        onGo: (where) => goFromPush(where),
        onLamp: (lampId) => goHash('/tonight', lampId ? { face: lampId } : ''),
      }).catch(() => {})
    })
    return stop
  }, [launchReady])

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0e1014' }}>
      {!fontsLoaded || !launchReady ? null : (
        <SafeAreaProvider>
          <StatusBar style="light" />
          <Boundary>
            <RootNavigator />
            <Slot>
              <DiagnosticsAsk />
            </Slot>
            <Slot>
              <StreakMomentHost />
            </Slot>
          </Boundary>
        </SafeAreaProvider>
      )}
    </GestureHandlerRootView>
  )
}
