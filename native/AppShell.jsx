import { useCallback, useEffect, useMemo, useState } from 'react'
import { Platform, UIManager, View } from 'react-native'
import { armLampPings, checkPings, pingButtonLabel, pingSupport, requestPings } from '../src/lib/notify.js'
import { usePrefs } from '../src/lib/prefs.js'
import { useHallColors } from './hooks/useHallColors.js'
import { useAppShelf } from './hooks/useAppShelf.js'
import { canGoBack, goBack, onRoute, peekBackRoute, readRoute } from './navigation/hash.js'
import { AppNav } from './components/AppNav.jsx'
import { CheerBurst } from './components/CheerBurst.jsx'
import { MarkToast } from './components/MarkToast.jsx'
import { SwipeBackShell } from './components/SwipeBackShell.jsx'
import { ScreenRouter } from './screens/ScreenRouter.jsx'

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
  const colors = useHallColors(app.book)
  const [pingState, setPingState] = useState(pingSupport)
  const backRoute = useMemo(() => peekBackRoute(), [route])
  const swipeBack = canGoBack()

  const askPings = useCallback(async () => {
    const next = await requestPings()
    setPingState(next)
    if (next === 'granted' && app.book) armLampPings(app.book)
  }, [app.book])

  useEffect(() => {
    checkPings().then(setPingState)
  }, [])

  useEffect(() => {
    if (app.book) armLampPings(app.book)
  }, [app.book])

  const pingLabel = pingButtonLabel(pingState)

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
      <SwipeBackShell
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
      </SwipeBackShell>
      {SITE.has(route.path) ? null : (
        <MarkToast mark={app.markNote} onClose={app.clearMark} colors={colors} />
      )}
      {SITE.has(route.path) ? null : <AppNav path={route.path} colors={colors} />}
      {SITE.has(route.path) ? null : <CheerBurst />}
    </View>
  )
}
