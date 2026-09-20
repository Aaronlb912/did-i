import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { currentBook, readShelf } from '../src/lib/board-shelf.js'
import { pullAndMerge } from '../src/lib/cloud-sync.js'
import { initGemIap } from '../src/lib/gem-iap.js'
import { bootNative, listenNativeShell, scheduleNativePings } from '../src/lib/native.js'
import { startPush } from '../src/lib/push.js'
import { needsEnter } from '../src/lib/session.js'
import { Boundary } from './components/Boundary.jsx'
import { RootNavigator } from './navigation/RootNavigator.jsx'
import { goBack, goHash } from './navigation/hash.js'

export function NativeApp() {
  useEffect(() => {
    bootNative()
    pullAndMerge()
    initGemIap()
    startPush((where) => goHash(where))
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Boundary>
          <RootNavigator />
        </Boundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
