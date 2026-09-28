import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAccount } from '../src/lib/account.js'
import { readShelf } from '../src/lib/board-shelf.js'
import { authGated } from '../src/lib/auth-gate.js'
import { armLampPings, checkPings, pingButtonLabel, pingSupport, requestPings } from '../src/lib/notify.js'
import { useAutoAdd } from '../src/lib/people.js'
import { t } from '../src/lib/i18n.js'
import { usePrefs } from '../src/lib/prefs.js'
import { useHallColors } from './hooks/useHallColors.js'
import { useAppShelf } from './hooks/useAppShelf.js'
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
import { SheetHost } from './components/SheetHost.jsx'
import { MarkToast } from './components/MarkToast.jsx'
import { ScreenRouter } from './screens/ScreenRouter.jsx'
import { SignInScreen } from './screens/SignInScreen.jsx'
import { captureInviteOnFirstLaunch } from './invite-capture.js'
import { initGemIap } from '../src/lib/gem-iap.js'
import { afterNativeBridgeReady } from './lib/defer-native.js'
import { fonts } from './theme.js'

const Stack = createNativeStackNavigator()

/**
 * The iOS navigation bar every screen wears. It floats over the page: clear
 * while the page sits at the top, the system material with a hairline once
 * content scrolls under it. Android draws its top app bar in the page instead.
 */
function barOptions(colors) {
  if (Platform.OS !== 'ios') return { headerShown: false }
  return {
    headerShown: true,
    headerTransparent: true,
    headerBlurEffect: 'systemChromeMaterial',
    // The material does the job of iOS 26's top edge blur; both at once overlap.
    scrollEdgeEffects: { top: 'hidden' },
    headerShadowVisible: true,
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
  return (
    <ScreenRoute.Provider value={route}>
      <ScreenRouter route={route} {...props} />
    </ScreenRoute.Provider>
  )
}

function TabScreen({ route }) {
  return <RouteBody route={routeFromScreen(route)} />
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
  const colors = useContext(ScreenProps).colors
  // The hall mounts first, so a goHash from before the stack existed lands now.
  useEffect(() => {
    flushNavigation()
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
            tabBarStyle: { backgroundColor: colors.panel },
            tabBarLabelStyle: { fontFamily: fonts.uiSemi },
          }
        : null),
    }),
    [colors],
  )
  return (
    <Tab.Navigator screenOptions={options} backBehavior="firstRoute">
      <Tab.Screen
        name="/tonight"
        component={TabScreen}
        options={{ tabBarLabel: t('nav.home'), tabBarIcon: TONIGHT_ICON, headerLargeTitleEnabled: false }}
      />
      <Tab.Screen
        name="/lamps"
        component={TabScreen}
        options={{ tabBarLabel: t('nav.questions'), tabBarIcon: QUESTIONS_ICON }}
      />
    </Tab.Navigator>
  )
}

// The tabs carry their own bars.
const HALL_OPTIONS = { headerShown: false }

function RouteScreen({ route }) {
  return <RouteBody route={routeFromScreen(route)} />
}

export function AppShell() {
  usePrefs()
  const route = useNativeRoute()
  const app = useAppShelf()
  const account = useAccount()
  const colors = useHallColors(app.book)
  const gated = authGated(route.path, account)
  const [pingState, setPingState] = useState(pingSupport)
  useAutoAdd(gated ? null : account.user, app.keepSent)

  const askPings = useCallback(async () => {
    const next = await requestPings()
    setPingState(next)
    if (next === 'granted' && app.book) armLampPings(app.shelf?.boards || app.book)
  }, [app.book, app.shelf])

  useEffect(() => {
    let alive = true
    let warm = null
    afterNativeBridgeReady(() => {
      // Connect the gem store in the background so the gem page has prices ready.
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
      if (alive) armLampPings(app.shelf?.boards || app.book)
    })
    return () => {
      alive = false
    }
  }, [app.book, app.shelf])

  const pingLabel = pingButtonLabel(pingState)

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
    }),
    [
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenProps.Provider value={screenProps}>
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen name={HALL} component={HallScreen} options={HALL_OPTIONS} />
          {STACK_PATHS.map((path) => (
            <Stack.Screen
              key={path}
              name={path}
              component={RouteScreen}
              options={OWN_BACK.has(path) ? { gestureEnabled: false } : undefined}
            />
          ))}
        </Stack.Navigator>
      </ScreenProps.Provider>
      <Slot>
        <MarkToast mark={app.markNote} onClose={app.clearMark} colors={colors} />
      </Slot>
      <View pointerEvents="box-none" style={styles.overlayLayer} collapsable={false}>
        <DidYouBanner path={route.path} colors={colors} />
        <SheetHost />
        <CheerBurstHost />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlayLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 200,
    elevation: 40,
  },
})
