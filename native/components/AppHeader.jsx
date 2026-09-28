import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Animated, Platform, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { t } from '../../src/lib/i18n.js'
import { canGoBack, goBack, onRoute, OWN_BACK } from '../navigation/hash.js'
import { useScreenRoute } from '../navigation/screen-route.js'
import { HEADER_BAR } from '../hooks/useHeaderSpace.js'
import { fonts } from '../theme.js'
import { BackArrow, BackChevron } from './BackChevron.jsx'
import { HeaderButton } from './HeaderButton.jsx'
import { MastMenuBridge, MastMenuCog, useMastMenu } from './MastMenu.jsx'
import { PurseLine } from './PurseLine.jsx'
import { Slot } from './Slot.jsx'

function useShowBack(back) {
  const [show, setShow] = useState(() => back === true || (back !== false && canGoBack()))
  useEffect(() => {
    if (back === false) {
      setShow(false)
      return undefined
    }
    const sync = () => setShow(back === true || canGoBack())
    sync()
    return onRoute(sync)
  }, [back])
  return show
}

/** Purse and menu, the right side of every header. */
function HeaderActions({ colors, purse, menu }) {
  return (
    <View style={styles.actions}>
      {purse ? (
        <Slot>
          <View style={styles.purse}>
            <PurseLine purse={purse} colors={colors} gemsLink mast />
          </View>
        </Slot>
      ) : null}
      {menu ? (
        <Slot>
          <MastMenuCog />
        </Slot>
      ) : null}
    </View>
  )
}

/**
 * The header every screen wears.
 *
 * iOS: the native-stack navigation bar. It is transparent while the page sits
 * at the top and turns into the system material with a hairline once content
 * scrolls under it. Page content is laid out below it, so nothing collides.
 *
 * Android: a Material 3 top app bar in the page flow. It is the page color at
 * rest and tints to the surface container once `scrollY` leaves the top.
 *
 * back: 'auto' shows back when a screen is pushed, true forces it, false hides it.
 * titleSlot replaces the title text (Tonight uses it for rename-in-place).
 * menu renders the grid button and needs a MastMenuRoot above it.
 */
export function AppHeader(props) {
  return Platform.OS === 'ios' ? <NativeBar {...props} /> : <TopAppBar {...props} />
}

function createSlot() {
  let value = null
  const listeners = new Set()
  return {
    get: () => value,
    set(next) {
      value = next
      listeners.forEach((fn) => fn())
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}

// Header items render in the navigator, not under the screen, so they read the
// screen's latest props from here instead of re-setting options every render.
function SlotPart({ slot, part }) {
  const value = useSyncExternalStore(slot.subscribe, slot.get)
  if (!value) return null
  const node =
    part === 'title' ? (
      value.titleSlot
    ) : part === 'left' ? (
      <HeaderButton bare colors={value.colors} onPress={() => goBack()} label={t('nav.back')}>
        <Slot>
          <BackChevron color={value.colors.on} size={28} />
        </Slot>
      </HeaderButton>
    ) : (
      <HeaderActions colors={value.colors} purse={value.purse} menu={value.menu} />
    )
  return <MastMenuBridge value={value.menuCtx}>{node}</MastMenuBridge>
}

function NativeBar({ colors, title, titleSlot, back = 'auto', purse, menu = false }) {
  const navigation = useNavigation()
  const menuCtx = useMastMenu()
  const path = useScreenRoute().path
  const slot = useRef(null)
  if (!slot.current) slot.current = createSlot()

  useLayoutEffect(() => {
    slot.current.set({ colors, titleSlot, purse, menu, menuCtx })
  })

  const hasTitleSlot = Boolean(titleSlot)
  const hasRight = Boolean(purse || menu)
  // /welcome and /enter decide where back goes, so they get their own button.
  const ownBack = OWN_BACK.has(path) && back !== false
  useLayoutEffect(() => {
    const current = slot.current
    navigation.setOptions({
      title: title || '',
      headerTitle: hasTitleSlot ? () => <SlotPart slot={current} part="title" /> : undefined,
      headerBackVisible: back !== false && !ownBack,
      headerLeft: ownBack ? () => <SlotPart slot={current} part="left" /> : undefined,
      headerRight: hasRight ? () => <SlotPart slot={current} part="right" /> : undefined,
    })
  }, [back, hasRight, hasTitleSlot, navigation, ownBack, title])

  return null
}

function TopAppBar({ colors, title, titleSlot, back = 'auto', purse, menu = false, scrollY }) {
  const insets = useSafeAreaInsets()
  const showBack = useShowBack(back)
  const tint = scrollY
    ? scrollY.interpolate({ inputRange: [0, 8], outputRange: [0, 1], extrapolate: 'clamp' })
    : 0

  return (
    <View style={[styles.appBar, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.panel, opacity: tint }]}
      />
      <View style={[styles.appBarRow, { paddingLeft: Math.max(4, insets.left + 4), paddingRight: Math.max(4, insets.right + 4) }]}>
        {showBack ? (
          <HeaderButton bare colors={colors} onPress={() => goBack()} label={t('nav.back')}>
            <Slot>
              <BackArrow color={colors.ink} />
            </Slot>
          </HeaderButton>
        ) : (
          <View style={styles.edge} />
        )}
        <View style={styles.titleBox}>
          {titleSlot || (
            <Text style={[headerTitleStyle, { color: colors.ink }]} numberOfLines={1} accessibilityRole="header">
              {title}
            </Text>
          )}
        </View>
        {purse || menu ? <HeaderActions colors={colors} purse={purse} menu={menu} /> : null}
      </View>
    </View>
  )
}

/** The bar title: the iOS navigation bar's, or Material 3's title-large. */
export const headerTitleStyle =
  Platform.OS === 'ios'
    ? { fontFamily: fonts.uiSemi, fontSize: 17, letterSpacing: -0.2 }
    : { fontFamily: fonts.ui, fontSize: 22, lineHeight: 28 }

const styles = StyleSheet.create({
  appBar: { zIndex: 40, elevation: 0 },
  appBarRow: { height: HEADER_BAR, flexDirection: 'row', alignItems: 'center', gap: 4 },
  edge: { width: 12 },
  titleBox: { flex: 1, minWidth: 0, justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  purse: { paddingHorizontal: 8, justifyContent: 'center' },
})
