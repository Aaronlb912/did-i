import { useCallback, useEffect, useMemo, useState } from 'react'
import { Platform, StyleSheet, UIManager, View } from 'react-native'
import { useAccount } from '../src/lib/account.js'
import { readShelf } from '../src/lib/board-shelf.js'
import { authGated } from '../src/lib/auth-gate.js'
import { armLampPings, checkPings, pingButtonLabel, pingSupport, requestPings } from '../src/lib/notify.js'
import { usePrefs } from '../src/lib/prefs.js'
import { useHallColors } from './hooks/useHallColors.js'
import { useAppShelf } from './hooks/useAppShelf.js'
import { canGoBack, goBack, goHash, onRoute, peekBackRoute, readRoute } from './navigation/hash.js'
import { AppNavHost } from './components/AppNavHost.jsx'
import { Slot } from './components/Slot.jsx'
import { CheerBurstHost } from './components/CheerBurstHost.jsx'
import { SheetHost } from './components/SheetHost.jsx'
import { MarkToast } from './components/MarkToast.jsx'
import { SwipeBackShellHost } from './components/SwipeBackShellHost.jsx'
import { ScreenRouter } from './screens/ScreenRouter.jsx'
import { SignInScreen } from './screens/SignInScreen.jsx'
import { afterNativeBridgeReady } from './lib/defer-native.js'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const SITE = new Set()

function useNativeRoute() {
  const [route, setRoute] = useState(readRoute)
  useEffect(() => onRoute(setRoute), [])
  return route
}

export function AppShell() {
  usePrefs()
  const route = useNativeRoute()
  const app = useAppShelf()
  const account = useAccount()
  const colors = useHallColors(app.book)
  const gated = authGated(route.path, account)
  const [pingState, setPingState] = useState(pingSupport)
  const backRoute = useMemo(() => peekBackRoute(), [route])
  const swipeBack = canGoBack()

  const askPings = useCallback(async () => {
    const next = await requestPings()
    setPingState(next)
    if (next === 'granted' && app.book) armLampPings(app.book)
  }, [app.book])

  useEffect(() => {
    let alive = true
    afterNativeBridgeReady(() => {
      checkPings()
        .then((next) => {
          if (alive) setPingState(next)
        })
        .catch(() => {})
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!app.book) return undefined
    let alive = true
    afterNativeBridgeReady(() => {
      if (alive) armLampPings(app.book)
    })
    return () => {
      alive = false
    }
  }, [app.book])

  const pingLabel = pingButtonLabel(pingState)

  if (gated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <SignInScreen
          onDone={() => {
            const shelf = readShelf()
            const empty = shelf.boards.every(
              (item) => (item.lamps || []).filter((lamp) => !lamp.archived).length === 0,
            )
            goHash(empty ? '/first' : '/tonight')
          }}
        />
      </View>
    )
  }

  const screenProps = {
    book: app.book,
    shelf: app.shelf,
    tagId: app.tagId,
    change: app.change,
    setTag: app.setTag,
    saveLamp: app.saveLamp,
    keepSent: app.keepSent,
    switchBoard: app.switchBoard,
    addBoard: app.addBoard,
    removeBoard: app.removeBoard,
    onImport: app.importShelf,
    onStartEmpty: app.startEmpty,
    onSendCopy: app.sendCopy,
    onAskPings: pingLabel ? askPings : undefined,
    pingLabel,
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SwipeBackShellHost
        enabled={swipeBack}
        back={backRoute}
        onBack={goBack}
        backChild={
          backRoute ? (
            <View style={{ flex: 1 }}>
              <ScreenRouter route={backRoute} {...screenProps} />
            </View>
          ) : null
        }
      >
        <View style={{ flex: 1 }}>
          <ScreenRouter route={route} {...screenProps} />
        </View>
      </SwipeBackShellHost>
      {SITE.has(route.path) ? null : (
        <Slot>
          <MarkToast mark={app.markNote} onClose={app.clearMark} colors={colors} />
        </Slot>
      )}
      {SITE.has(route.path) ? null : (
        <View pointerEvents="box-none" style={styles.navLayer}>
          <AppNavHost path={route.path} colors={colors} />
        </View>
      )}
      {SITE.has(route.path) ? null : (
        <View pointerEvents="box-none" style={styles.overlayLayer} collapsable={false}>
          <SheetHost />
          <CheerBurstHost />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  // Only the bar. A full-screen layer here sat on top of the menu and the
  // shop chips, so those taps never landed.
  navLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 80,
    elevation: 24,
  },
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    elevation: 40,
  },
})
