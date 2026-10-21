import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, Linking, Platform, StyleSheet, View } from 'react-native'
import { LayoutAnimationConfig } from 'react-native-reanimated'
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable'
import { needsEnter } from '../src/lib/session.js'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAccount } from '../src/lib/account.js'
import { readShelf } from '../src/lib/board-shelf.js'
import { readTour } from '../src/lib/first-run.js'
import { firstPullWaiting, useSync } from '../src/lib/cloud-sync.js'
import { authGated } from '../src/lib/auth-gate.js'
import { armLampPings, checkPings, pingButtonLabel, pingSupport, requestPings } from '../src/lib/notify.js'
import { useAutoAdd } from '../src/lib/people.js'
import { t } from '../src/lib/i18n.js'
import { usePrefs } from '../src/lib/prefs.js'
import { useHallColors } from './hooks/useHallColors.js'
import { useAppShelf } from './hooks/useAppShelf.js'
import { offerExactAlarms } from './lib/exact-alarms.js'
import { syncTonightWidget } from './widget-sync.js'
import {
  flushNavigation,
  goHash,
  HALL,
  onRoute,
  OWN_BACK,
  readRoute,
  routeFromScreen,
  STACK_PATHS,
} from './navigation/hash.js'
import { ScreenRoute } from './navigation/screen-route.js'
import { Slot } from './components/Slot.jsx'
import { CheerBurstHost } from './components/CheerBurstHost.jsx'
import { DidYouBanner } from './components/DidYouBanner.jsx'
import { UpdatePrompt } from './components/UpdatePrompt.jsx'
import { SheetHost, onSheetUp } from './components/SheetHost.jsx'
import { DidYouLinkHost } from './components/DidYouLinkHost.jsx'
import { InviteAskHost } from './components/InviteAskHost.jsx'
import { TourHost } from './components/TourHost.jsx'
import { setTourBalanceHandler } from './lib/tour.js'
import { lazyScreen } from './lib/lazy-screen.jsx'
import { ToastHost } from './components/ToastHost.jsx'
import { resumeCheckOnStops } from './components/LampManage.jsx'
import { FlyHost } from './components/FlyHost.jsx'
import { useMarksHeld } from './lib/mark-hold.js'
import { showToast, undoUp, useToastQueue } from './lib/toast-queue.js'
import { startOtaRefresh } from './lib/ota-refresh.js'
import { ScreenRouter, warmScreens } from './screens/ScreenRouter.jsx'
import { SignInScreen } from './screens/SignInScreen.jsx'
import { FirstSwipe } from './components/FirstSwipe.jsx'
import { LegalPlain } from './screens/LegalScreen.jsx'
import { captureInviteOnFirstLaunch } from './invite-capture.js'
import { initGemIap } from '../src/lib/gem-iap.js'
import { reportRejection } from '../src/lib/report.js'
import { afterNativeBridgeReady } from './lib/defer-native.js'
import { offerFirstPingPrimer, offerPingPrimerAgain, onPingState } from './lib/ping-primer.js'
import { syncPushTokenIfAllowed } from '../src/lib/push.js'
import { fonts } from './theme.js'
import { noteFrameTouch } from './components/frames/index.js'
import { TabSlide } from './components/TabSlide.jsx'
import { noteMilestone } from '../src/lib/milestones.js'

// The shop module is big; gifts wait until the first frame is up.
const GiftHost = lazyScreen(() => require('./screens/shop.jsx'), 'GiftHost')

const Stack = createNativeStackNavigator()

/**
 * The iOS navigation bar every screen wears. It floats over the page: clear
 * while the page sits at the top, the system material with a hairline once
 * content scrolls under it. Android draws its top app bar in the page instead.
 */
// Add forms have no page title (BoardShell noTitle), so no large title either.
const NO_TITLE = new Set(['/hang', '/we/new'])

const GLASS_BAR = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26

function barOptions(colors) {
  if (Platform.OS !== 'ios') return { headerShown: false }
  return {
    headerShown: true,
    headerTransparent: true,
    // iOS 26 fades the page out under the bar with its soft edge, like the
    // system apps. Older iOS has no edge effect, so it keeps a thin material.
    // (The chrome material read as a solid grey block in dark mode.)
    ...(GLASS_BAR
      ? { scrollEdgeEffects: { top: 'soft' }, headerShadowVisible: false }
      : { headerBlurEffect: 'systemUltraThinMaterial', scrollEdgeEffects: { top: 'hidden' }, headerShadowVisible: false }),
    headerLargeStyle: { backgroundColor: 'transparent' },
    headerLargeTitleShadowVisible: false,
    headerTintColor: colors.on,
    headerTitleStyle: { fontFamily: fonts.uiSemi, color: colors.ink },
    // Every pushed page scrolls, so its title starts large and shrinks into the bar.
    headerLargeTitleEnabled: true,
    headerLargeTitleStyle: { fontFamily: fonts.display, color: colors.ink },
    headerBackButtonDisplayMode: 'minimal',
    title: '',
  }
}
const Tab = createNativeBottomTabNavigator()
const ScreenProps = createContext(null)

function useNativeRoute() {
  const [route, setRoute] = useState(readRoute)
  useEffect(() => onRoute(setRoute), [])
  return route
}

/** One route's page, fed the shelf the whole app shares. */
function RouteBody({ route }) {
  const props = useContext(ScreenProps)
  // The page itself slides in, so the blocks on it skip their own fade on
  // that first frame; running both at once stuttered on iPhone. Anything that
  // opens or loads in later still fades in.
  return (
    <LayoutAnimationConfig skipEntering>
      <ScreenRoute.Provider value={route}>
        <ScreenRouter route={route} {...props} />
      </ScreenRoute.Provider>
    </LayoutAnimationConfig>
  )
}

/** A tab or a pushed screen: the route its navigator gave it. */
// The same route object while nothing in it changed (the folder filter too,
// which is not a navigator param), so context readers and memoized screens
// do not redraw on every shell render.
function useScreenRoute(route) {
  const next = routeFromScreen(route)
  const kept = useRef(next)
  const was = kept.current
  if (Object.keys(next).some((key) => next[key] !== was[key])) kept.current = next
  return kept.current
}

function RouteScreen({ route }) {
  return <RouteBody route={useScreenRoute(route)} />
}

// The two tabs, in bar order, so a switch slides in from the side you moved to.
const TAB_ORDER = ['/tonight', '/lamps']
function TabRouteScreen({ route }) {
  return (
    <TabSlide index={TAB_ORDER.indexOf(route.name)}>
      <RouteBody route={useScreenRoute(route)} />
    </TabSlide>
  )
}

// SF Symbols on iOS; on Android, Material-style glyphs tinted by the bar,
// filled when the tab is on.
const TONIGHT_ICON =
  Platform.OS === 'ios'
    ? ({ focused }) => ({ type: 'sfSymbol', name: focused ? 'moon.stars.fill' : 'moon.stars' })
    : ({ focused }) => ({
        type: 'image',
        source: focused ? require('./assets/tabs/tonight-on.png') : require('./assets/tabs/tonight.png'),
      })
const QUESTIONS_ICON =
  Platform.OS === 'ios'
    ? { type: 'sfSymbol', name: 'checklist' }
    : { type: 'image', source: require('./assets/tabs/questions.png') }

/** The root screen: Tonight and Questions in the system tab bar. */
function HallScreen() {
  const { colors, locked, firstAdd } = useContext(ScreenProps)
  // The hall mounts first, so a goHash from before the stack existed lands now.
  useEffect(() => {
    flushNavigation()
    noteMilestone('opened')
  }, [])
  const options = useMemo(
    () => ({
      ...barOptions(colors),
      // The lime accent carries over as the tint; Android wears it on the active pill.
      tabBarActiveTintColor: colors.on,
      tabBarInactiveTintColor: colors.inkSoft,
      tabBarActiveIndicatorColor: `${colors.on}33`,
      tabBarMinimizeBehavior: 'onScrollDown',
      ...(Platform.OS === 'android'
        ? {
            tabBarStyle: { backgroundColor: colors.panel, display: locked || firstAdd ? 'none' : 'flex' },
            tabBarLabelStyle: { fontFamily: fonts.uiSemi },
          }
        : { tabBarStyle: { display: locked || firstAdd ? 'none' : 'flex' } }),
    }),
    [colors, locked, firstAdd],
  )
  return (
    <Tab.Navigator screenOptions={options} backBehavior="firstRoute">
      <Tab.Screen
        name="/tonight"
        component={TabRouteScreen}
        options={{ tabBarLabel: t('nav.home'), tabBarIcon: TONIGHT_ICON, headerLargeTitleEnabled: false }}
      />
      <Tab.Screen
        name="/lamps"
        component={TabRouteScreen}
        options={{ tabBarLabel: t('nav.questions'), tabBarIcon: QUESTIONS_ICON }}
      />
    </Tab.Navigator>
  )
}

// The tabs carry their own bars.
const HALL_OPTIONS = { headerShown: false }

export function AppShell() {
  const prefs = usePrefs()
  const route = useNativeRoute()
  const app = useAppShelf()
  useEffect(() => {
    setTourBalanceHandler(app.applyCoinBalance)
    return () => setTourBalanceHandler(null)
  }, [app.applyCoinBalance])
  const marksHeld = useMarksHeld()
  // A new mark joins the toast line once the night's celebration is over.
  // It also waits while an undo is up, so a tap on Undo never lands on it.
  const toasts = useToastQueue()
  const mark = marksHeld || undoUp(toasts) ? null : app.markNote
  const clearMark = app.clearMark
  useEffect(() => {
    if (!mark) return
    showToast({ id: `mark:${mark.id || 'mark'}`, kind: 'mark', mark, ms: 5200, onGone: clearMark })
  }, [clearMark, mark])
  const account = useAccount()
  const sync = useSync()
  const colors = useHallColors(app.book)
  // Terms and privacy before sign-in open over sign-in, not in the navigator,
  // which is not there yet.
  const legalOut = (route.path === '/terms' || route.path === '/privacy') && authGated('/', account)
  const gated = legalOut || authGated(route.path, account)
  const [pingState, setPingState] = useState(pingSupport)
  const [booted, setBooted] = useState(false)
  useAutoAdd(gated ? null : account.user, app.keepSent)

  const leaveLegal = useCallback(() => goHash('/enter'), [])
  const askPings = useCallback(async () => {
    // Once the phone has said no it will not ask again; only its settings can undo that.
    if (pingState === 'denied') {
      Linking.openSettings().catch(() => {})
      return
    }
    const next = await requestPings()
    setPingState(next)
    if (next === 'granted' && app.book) armLampPings(app.shelf?.boards || app.book).catch(reportRejection('arm-pings'))
    if (next === 'granted') offerExactAlarms(colors).catch(() => {})
  }, [app.book, app.shelf, pingState, colors])

  useEffect(() => onPingState(setPingState), [])

  // A new over-the-air update loads on the next return to the app, not two cold starts later.
  useEffect(() => startOtaRefresh(), [])

  // Back from the phone's settings: pick up whatever changed there.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return
      checkPings()
        .then((state) => {
          setPingState(state)
          if (state === 'granted') syncPushTokenIfAllowed().catch(() => {})
          // Back from the phone's settings, maybe with Alarms & reminders now
          // on: set the alarms again so they land on the minute.
          const shelf = readShelf()
          if (state === 'granted' && shelf?.boards?.length) armLampPings(shelf.boards).catch(() => {})
          syncTonightWidget(shelf).catch(() => {})
        })
        .catch(() => {})
    })
    return () => sub.remove()
  }, [])

  // Past sign-in and past the first-night setup (which asks on its own way
  // out), so nobody has to go looking for it.
  const shelfReady = Boolean(app.book)
  const settingUp = OWN_BACK.has(route.path)
  useEffect(() => {
    if (gated || settingUp || !shelfReady || Platform.OS === 'web') return undefined
    const timer = setTimeout(() => offerFirstPingPrimer(colors).catch(() => {}), 1200)
    return () => clearTimeout(timer)
    // colors only styles the sheet; a theme change should not re-arm the ask.
  }, [gated, settingUp, shelfReady])

  // A Did made in this run is the one later ask for a Not now.
  const didCount = useRef(null)
  useEffect(() => {
    if (gated || Platform.OS === 'web' || !app.shelf?.boards) return undefined
    let n = 0
    for (const board of app.shelf.boards) for (const row of board.answers || []) if (row.status === 'yes' || row.status === 'late') n += 1
    const was = didCount.current
    didCount.current = n
    // Not cleared on the next shelf write (sync lands right after a tap); the ask runs once anyway.
    if (was != null && n > was) setTimeout(() => offerPingPrimerAgain(colors).catch(() => {}), 2500)
    return undefined
    // colors only styles the sheet.
  }, [gated, app.shelf])

  useEffect(() => {
    let alive = true
    let warm = null
    afterNativeBridgeReady(() => {
      // Connect the gem store in the background so the gem page has prices ready.
      if (alive) {
        setBooted(true)
        warmScreens()
      }
      warm = setTimeout(() => initGemIap().catch(() => {}), 3000)
      captureInviteOnFirstLaunch()
      checkPings()
        .then((next) => {
          if (alive) setPingState(next)
        })
        .catch(() => {})
    })
    return () => {
      alive = false
      if (warm) clearTimeout(warm)
    }
  }, [])

  useEffect(() => {
    if (!app.book) return undefined
    let alive = true
    afterNativeBridgeReady(() => {
      if (alive) armLampPings(app.shelf?.boards || app.book).catch(reportRejection('arm-pings'))
    })
    return () => {
      alive = false
    }
  }, [app.book, app.shelf])

  // Ping text follows gentle, language and the 12/24h clock: set them again.
  const pingWords = `${prefs.gentle}|${prefs.locale}|${prefs.clock}`
  const [armedWords, setArmedWords] = useState(pingWords)
  // An open sheet hides the screens behind it from TalkBack (Android).
  const [sheetUp, setSheetUp] = useState(false)
  useEffect(() => {
    const stop = onSheetUp(setSheetUp)
    return () => {
      stop()
    }
  }, [])
  useEffect(() => {
    if (pingWords === armedWords) return
    setArmedWords(pingWords)
    const shelf = readShelf()
    if (shelf?.boards?.length) armLampPings(shelf.boards).catch(reportRejection('arm-pings'))
  }, [armedWords, pingWords])

  // Check-ons still waiting to stop when the app closed during an undo.
  const signedIn = Boolean(account.user)
  useEffect(() => {
    if (signedIn && shelfReady) resumeCheckOnStops()
  }, [signedIn, shelfReady])

  const pingLabel = pingButtonLabel(pingState)

  const locked = needsEnter(app.book)
  // Someone new adds a first question before the tabs show (TonightScreen hides the menu).
  // Signed in, it waits for a first pull that worked, so a returning account on
  // a new phone is never shut out by a shelf that has not arrived.
  const firstAdd =
    Boolean(app.shelf?.boards) &&
    app.shelf.boards.every((board) => !(board.lamps || []).some((lamp) => !lamp.archived)) &&
    readTour().basics === 'new' &&
    (!account.user || (!firstPullWaiting(sync) && !sync.miss))
  const screenProps = useMemo(
    () => ({
      colors,
      book: app.book,
      shelf: app.shelf,
      tagId: app.tagId,
      change: app.change,
      changeBooks: app.changeBooks,
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
      // The PIN screen shows no tabs, so nothing behind it looks reachable.
      locked,
      firstAdd,
    }),
    [
      locked,
      firstAdd,
      app.addBoard,
      app.book,
      app.change,
      app.changeBooks,
      app.importShelf,
      app.keepSent,
      app.removeBoard,
      app.saveLamp,
      app.sendCopy,
      app.setTag,
      app.shelf,
      app.startEmpty,
      app.switchBoard,
      app.tagId,
      askPings,
      colors,
      pingLabel,
    ],
  )

  const screenOptions = useMemo(
    () => ({
      ...barOptions(colors),
      // The platform push: iOS slides with parallax and follows the edge swipe,
      // Android runs the Material shared-axis transition.
      animation: 'default',
      freezeOnBlur: true,
      contentStyle: { backgroundColor: colors.bg },
    }),
    [colors],
  )

  if (legalOut) {
    return <LegalPlain kind={route.path === '/privacy' ? 'privacy' : 'terms'} colors={colors} onBack={leaveLegal} />
  }

  if (gated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <SignInScreen
          onDone={() => {
            // A scanned code waiting on sign in stays where it is.
            if (readRoute().path === '/people/connect') return
            const shelf = readShelf()
            const empty = shelf.boards.every(
              (item) => (item.lamps || []).filter((lamp) => !lamp.archived).length === 0,
            )
            goHash(empty ? '/first' : '/tonight')
          }}
        />
        <FirstSwipe colors={colors} />
      </View>
    )
  }

  return (
    // Any touch wakes a sleeping frame (battery rules in useFrameActive).
    <View style={{ flex: 1, backgroundColor: colors.bg }} onTouchStart={noteFrameTouch}>
      {/* TalkBack stays in an open sheet: the screens behind leave the tree
          while one is up (VoiceOver: accessibilityViewIsModal in SheetHost). */}
      {/* On iOS it stays a layout-only view that Fabric flattens away, so the
          native stack sits exactly where it did. */}
      <View
        style={styles.screens}
        collapsable={Platform.OS === 'android' ? false : undefined}
        importantForAccessibility={Platform.OS === 'android' && sheetUp ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={Platform.OS === 'ios' && sheetUp ? true : undefined}
      >
      <ScreenProps.Provider value={screenProps}>
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen name={HALL} component={HallScreen} options={HALL_OPTIONS} />
          {STACK_PATHS.map((path) => (
            <Stack.Screen
              key={path}
              name={path}
              component={RouteScreen}
              options={
                // Android draws a form sheet as a page with an empty band on top, so Add is a plain page there.
                path === '/add' && Platform.OS === 'ios'
                  ? { presentation: 'formSheet', sheetGrabberVisible: true, headerLargeTitleEnabled: false }
                  : NO_TITLE.has(path)
                    ? { headerLargeTitleEnabled: false }
                  : OWN_BACK.has(path)
                    ? { gestureEnabled: false }
                    : undefined
              }
            />
          ))}
        </Stack.Navigator>
      </ScreenProps.Provider>
      </View>
      <Slot>
        <ToastHost colors={colors} />
      </Slot>
      <View pointerEvents="box-none" style={styles.overlayLayer} collapsable={false}>
        <DidYouBanner path={route.path} colors={colors} />
        <UpdatePrompt path={route.path} colors={colors} />
        {booted && app.book && !gated ? <GiftHost book={app.book} onChange={app.change} /> : null}
        {app.book && !gated ? <DidYouLinkHost colors={colors} onKeep={app.keepSent} /> : null}
        {booted && app.book && !gated ? <InviteAskHost colors={colors} book={app.book} onChange={app.change} path={route.path} /> : null}
        {booted && app.book && !gated ? <TourHost path={route.path} hasQuestion={(app.book.lamps || []).some((lamp) => !lamp.archived)} /> : null}
        <SheetHost />
        <CheerBurstHost />
        <Slot>
          <FlyHost />
        </Slot>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screens: { flex: 1 },
  overlayLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 200,
    elevation: 40,
  },
})
