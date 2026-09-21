import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { currentBook, readShelf } from '../src/lib/board-shelf.js'
import { pullAndMerge } from '../src/lib/cloud-sync.js'
import { bootNative, listenNativeShell, scheduleNativePings } from '../src/lib/native.js'
import { ensureMyPhone } from '../src/lib/people.js'
import { cloudSetUp } from '../src/lib/cloud.js'
import { startPush } from '../src/lib/push.js'
import { needsEnter } from '../src/lib/session.js'
import { Boundary } from './components/Boundary.jsx'
import { DiagnosticsAsk } from './components/DiagnosticsAsk.jsx'
import { StreakMomentHost } from './components/StreakMoment.jsx'
import { RootNavigator } from './navigation/RootNavigator.jsx'
import { goBack, goFromPush } from './navigation/hash.js'
import { useAppFonts } from './useAppFonts.js'

SplashScreen.preventAutoHideAsync().catch(() => {})

export function NativeApp() {
  const fontsLoaded = useAppFonts()

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {})
  }, [fontsLoaded])

  useEffect(() => {
    bootNative()
    pullAndMerge().then(() => {
      if (cloudSetUp()) void ensureMyPhone()
    })
    startPush((where) => goFromPush(where))
    const stop = listenNativeShell({
      onBack() {
        const shelf = readShelf()
        const book = currentBook(shelf)
        const empty = (book?.lamps || []).filter((lamp) => !lamp.archived).length === 0
        goBack({ emptyHall: empty, needsEnter: needsEnter(book) })
      },
      onOpenLamp(lampId) {
        goHash('/tonight', lampId ? { face: lampId } : '')
      },
    })
    return stop
  }, [])

  useEffect(() => {
    const shelf = readShelf()
    const book = currentBook(shelf)
    if (book) scheduleNativePings(book)
  }, [])

  if (!fontsLoaded) {
    return <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0e1014' }} />
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Boundary>
          <RootNavigator />
          <DiagnosticsAsk />
          <StreakMomentHost />
        </Boundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
