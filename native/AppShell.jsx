import { useCallback, useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DIT_ENABLED } from '../src/lib/features.js'
import { t } from '../src/lib/i18n.js'
import { armLampPings, checkPings, pingButtonLabel, pingSupport, requestPings } from '../src/lib/notify.js'
import { useHallColors } from './hooks/useHallColors.js'
import { needsEnter } from '../src/lib/session.js'
import { welcomeSeen } from '../src/lib/hall-pages.js'
import { useAppShelf } from './hooks/useAppShelf.js'
import { onRoute, goHash, readRoute } from './navigation/hash.js'
import { CheerBurst } from './components/CheerBurst.jsx'
import { MarkToast } from './components/MarkToast.jsx'
import { ScreenRouter } from './screens/ScreenRouter.jsx'
import { fonts } from './theme.js'

const HALL = new Set(['/', '/home', '/tonight'])
// The marketing pages are web only; the native router never resolves them.
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
  { path: '/settings', labelKey: 'settings.kicker', match: ['/settings', '/account', '/people', '/shop', '/kit', '/gems'] },
]

function tabIndex(path) {
  const i = TABS.findIndex((tab) => tab.match.includes(path))
  return i < 0 ? -1 : i
}

function AppNav({ path, colors }) {
  const insets = useSafeAreaInsets()
  const at = tabIndex(path)
  if (SITE.has(path) || path === '/welcome' || path === '/enter' || path === '/first') return null
  return (
    <View style={[styles.tabs, { paddingBottom: insets.bottom + 6, backgroundColor: colors.panel, borderTopColor: colors.line }]}>
      {TABS.map((tab, index) => {
        const on = index === at
        return (
          <Pressable
            key={tab.path}
            onPress={() => goHash(tab.path)}
            style={[styles.tab, on && { backgroundColor: colors.on }]}
          >
            <Text style={[styles.tabText, { color: on ? colors.bg : colors.inkSoft }]}>{t(tab.labelKey)}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function AppShell() {
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
        <>
          <CheerBurst />
          <MarkToast mark={app.markNote} onClose={app.clearMark} colors={colors} />
        </>
      )}
      {showNav ? <AppNav path={route.path} colors={colors} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  tab: {
    flex: 1,
    borderRadius: 999,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    fontWeight: '600',
  },
})
