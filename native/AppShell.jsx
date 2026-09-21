import { useCallback, useEffect, useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DIT_ENABLED } from '../src/lib/features.js'
import { t } from '../src/lib/i18n.js'
import { usePrefs } from '../src/lib/prefs.js'
import { armLampPings, checkPings, pingButtonLabel, pingSupport, requestPings } from '../src/lib/notify.js'
import { useHallColors } from './hooks/useHallColors.js'
import { needsEnter } from '../src/lib/session.js'
import { welcomeSeen } from '../src/lib/hall-pages.js'
import { useAppShelf } from './hooks/useAppShelf.js'
import { onRoute, goHash, readRoute } from './navigation/hash.js'
import { CheerBurst } from './components/CheerBurst.jsx'
import { MarkToast } from './components/MarkToast.jsx'
import { NAV_GAP, NAV_PAD, NAV_TAB_HEIGHT } from './hooks/useAppInsets.js'
import { ScreenRouter } from './screens/ScreenRouter.jsx'
import { fonts } from './theme.js'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const HALL = new Set(['/', '/home', '/tonight'])
const SITE = new Set()

function useNativeRoute() {
  const [route, setRoute] = useState(readRoute)
  useEffect(() => onRoute(setRoute), [])
  return route
}

const TABS = [
  { path: '/tonight', labelKey: 'nav.home', match: ['/', '/home', '/tonight', '/later'] },
  { path: '/lamps', labelKey: 'nav.questions', match: ['/lamps', '/add', '/hang', '/lamp', '/search', '/ideas'] },
  ...(DIT_ENABLED ? [{ path: '/everyone', labelKey: 'nav.everyone', match: ['/everyone'] }] : []),
]

function tabIndex(path) {
  const i = TABS.findIndex((tab) => tab.match.includes(path))
  return i < 0 ? -1 : i
}

const SPRING = { damping: 20, stiffness: 280, mass: 0.8 }

function AppNav({ path, colors }) {
  const insets = useSafeAreaInsets()
  const at = tabIndex(path)
  const [barWidth, setBarWidth] = useState(0)
  const [live, setLive] = useState(false)
  const slot = useSharedValue(at >= 0 ? at : 0)
  const showPip = useSharedValue(at >= 0 ? 1 : 0)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setLive(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    slot.value = withSpring(at >= 0 ? at : 0, SPRING)
    showPip.value = withSpring(at >= 0 ? 1 : 0, SPRING)
  }, [at, slot, showPip])

  if (SITE.has(path) || path === '/welcome' || path === '/enter' || path === '/first') return null

  const gap = 2
  const pad = NAV_PAD
  const tabW = barWidth > 0 ? (barWidth - pad * 2 - gap * (TABS.length - 1)) / TABS.length : 0

  const pipStyle = useAnimatedStyle(() => ({
    opacity: showPip.value,
    transform: [{ translateX: slot.value * (tabW + gap) }],
  }))

  return (
    <View pointerEvents="box-none" style={[styles.navWrap, { paddingBottom: insets.bottom + NAV_GAP }]}>
      <View
        style={[styles.navBar, { backgroundColor: colors.panel2, borderColor: colors.line }]}
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      >
        {tabW > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pip,
              live && styles.pipLive,
              { backgroundColor: colors.on, width: tabW, left: pad },
              pipStyle,
            ]}
          />
        ) : null}
        {TABS.map((tab, index) => {
          const on = index === at
          return (
            <Pressable key={tab.path} onPress={() => goHash(tab.path)} style={styles.tab}>
              <Text style={[styles.tabText, { color: on ? colors.bg : colors.inkSoft }]}>{t(tab.labelKey)}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export function AppShell() {
  usePrefs()
  const route = useNativeRoute()
  const app = useAppShelf()
  const colors = useHallColors(app.book)
  const [pingState, setPingState] = useState(pingSupport)

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
  const emptyHall = app.shelf.boards.every(
    (item) => (item.lamps || []).filter((lamp) => !lamp.archived).length === 0,
  )
  const showNav =
    !SITE.has(route.path) &&
    route.path !== '/welcome' &&
    route.path !== '/enter' &&
    route.path !== '/first' &&
    route.path !== '/privacy' &&
    route.path !== '/terms' &&
    !(needsEnter(app.book) && route.path !== '/welcome') &&
    !(HALL.has(route.path) && emptyHall && !welcomeSeen())

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenRouter
        route={route}
        book={app.book}
        shelf={app.shelf}
        tagId={app.tagId}
        change={app.change}
        setTag={app.setTag}
        saveLamp={app.saveLamp}
        keepSent={app.keepSent}
        switchBoard={app.switchBoard}
        addBoard={app.addBoard}
        removeBoard={app.removeBoard}
        onImport={app.importShelf}
        onStartEmpty={app.startEmpty}
        onSendCopy={app.sendCopy}
        onAskPings={pingLabel ? askPings : undefined}
        pingLabel={pingLabel}
      />
      {SITE.has(route.path) ? null : (
        <MarkToast mark={app.markNote} onClose={app.clearMark} colors={colors} />
      )}
      {showNav ? <AppNav path={route.path} colors={colors} /> : null}
      {SITE.has(route.path) ? null : <CheerBurst />}
    </View>
  )
}

const styles = StyleSheet.create({
  navWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  navBar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 416,
    borderWidth: 1,
    borderRadius: 999,
    padding: NAV_PAD,
    gap: 2,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  pip: {
    position: 'absolute',
    top: NAV_PAD,
    bottom: NAV_PAD,
    borderRadius: 999,
  },
  pipLive: {},
  tab: {
    flex: 1,
    minHeight: NAV_TAB_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    zIndex: 1,
  },
  tabText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    fontWeight: '600',
  },
})
