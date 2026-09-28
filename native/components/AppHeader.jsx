import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
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

/** A plain text nav-bar button: a sheet's Cancel or its primary action. */
function HeaderTextButton({ colors, label, onPress, disabled, accent }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={styles.textAction}
    >
      <Text
        style={[
          styles.textActionLabel,
          { color: accent ? colors.on : colors.ink },
          disabled && { color: colors.inkDim },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
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
 * large: the title starts large and shrinks into the bar as the page scrolls.
 * On Android that is Material 3's medium top app bar, whose expanded title
 * (HeaderLargeTitle) sits at the top of the page. On iOS it is the large
 * title, set per screen in AppShell: UIKit only collapses it when it is on
 * before the screen is pushed.
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
      value.leftAction ? (
        <HeaderTextButton colors={value.colors} label={value.leftAction.label} onPress={value.leftAction.onPress} />
      ) : (
        <HeaderButton bare colors={value.colors} onPress={() => goBack()} label={t('nav.back')}>
          <Slot>
            <BackChevron color={value.colors.on} size={28} />
          </Slot>
        </HeaderButton>
      )
    ) : value.rightAction ? (
      <HeaderTextButton
        colors={value.colors}
        label={value.rightAction.label}
        onPress={value.rightAction.onPress}
        disabled={value.rightAction.disabled}
        accent
      />
    ) : (
      <HeaderActions colors={value.colors} purse={value.purse} menu={value.menu} />
    )
  return <MastMenuBridge value={value.menuCtx}>{node}</MastMenuBridge>
}

function NativeBar({ colors, title, titleSlot, back = 'auto', purse, menu = false, leftAction, rightAction }) {
  const navigation = useNavigation()
  const menuCtx = useMastMenu()
  const path = useScreenRoute().path
  const slot = useRef(null)
  if (!slot.current) slot.current = createSlot()

  useLayoutEffect(() => {
    slot.current.set({ colors, titleSlot, purse, menu, menuCtx, leftAction, rightAction })
  })

  const hasTitleSlot = Boolean(titleSlot)
  const hasLeftAction = Boolean(leftAction)
  const hasRight = Boolean(purse || menu || rightAction)
  // /welcome and /enter decide where back goes, so they get their own button.
  const ownBack = OWN_BACK.has(path) && back !== false
  useLayoutEffect(() => {
    const current = slot.current
    navigation.setOptions({
      title: title || '',
      headerTitle: hasTitleSlot ? () => <SlotPart slot={current} part="title" /> : undefined,
      headerBackVisible: back !== false && !ownBack && !hasLeftAction,
      headerLeft: ownBack || hasLeftAction ? () => <SlotPart slot={current} part="left" /> : undefined,
      headerRight: hasRight ? () => <SlotPart slot={current} part="right" /> : undefined,
    })
  }, [back, hasLeftAction, hasRight, hasTitleSlot, navigation, ownBack, title])

  return null
}

// The expanded title of Material's medium bar is 48dp under the bar row,
// taller when a big text size wraps it onto a second line.
export const LARGE_TITLE = 48

function TopAppBar({
  colors,
  title,
  titleSlot,
  back = 'auto',
  purse,
  menu = false,
  large = false,
  largeHeight = LARGE_TITLE,
  scrollY,
  leftAction,
  rightAction,
}) {
  const insets = useSafeAreaInsets()
  const showBack = useShowBack(leftAction ? false : back)
  // Clear at rest; the surface container once content (or the expanded title) goes under it.
  const under = large ? largeHeight : 0
  const tint = scrollY
    ? scrollY.interpolate({ inputRange: [under, under + 8], outputRange: [0, 1], extrapolate: 'clamp' })
    : 0
  // The small title comes in as the expanded one scrolls away.
  const titleIn =
    large && scrollY
      ? scrollY.interpolate({ inputRange: [largeHeight - 20, largeHeight], outputRange: [0, 1], extrapolate: 'clamp' })
      : 1

  return (
    <View style={[styles.appBar, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.panel, opacity: tint }]}
      />
      <View style={[styles.appBarRow, { paddingLeft: Math.max(4, insets.left + 4), paddingRight: Math.max(4, insets.right + 4) }]}>
        {leftAction ? (
          <HeaderTextButton colors={colors} label={leftAction.label} onPress={leftAction.onPress} />
        ) : showBack ? (
          <HeaderButton bare colors={colors} onPress={() => goBack()} label={t('nav.back')}>
            <Slot>
              <BackArrow color={colors.ink} />
            </Slot>
          </HeaderButton>
        ) : (
          <View style={styles.edge} />
        )}
        <Animated.View style={[styles.titleBox, { opacity: titleIn }]}>
          {titleSlot || (
            <Text
              style={[headerTitleStyle, { color: colors.ink }]}
              numberOfLines={1}
              accessibilityRole="header"
              importantForAccessibility={large ? 'no-hide-descendants' : 'auto'}
            >
              {title}
            </Text>
          )}
        </Animated.View>
        {rightAction ? (
          <HeaderTextButton
            colors={colors}
            label={rightAction.label}
            onPress={rightAction.onPress}
            disabled={rightAction.disabled}
            accent
          />
        ) : purse || menu ? (
          <HeaderActions colors={colors} purse={purse} menu={menu} />
        ) : null}
      </View>
    </View>
  )
}

/** Android's expanded title, the first thing in a `large` page. iOS draws its own. */
export function HeaderLargeTitle({ colors, title, onHeight }) {
  if (Platform.OS === 'ios') return null
  return (
    <View style={styles.largeBox} onLayout={onHeight ? (e) => onHeight(Math.round(e.nativeEvent.layout.height)) : undefined}>
      <Text style={[styles.largeTitle, { color: colors.ink }]} numberOfLines={2} accessibilityRole="header">
        {title}
      </Text>
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
  largeBox: { minHeight: LARGE_TITLE, justifyContent: 'flex-end', paddingBottom: 10 },
  largeTitle: { fontFamily: fonts.display, fontSize: 24, lineHeight: 32 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  purse: { paddingHorizontal: 8, justifyContent: 'center' },
  textAction: { paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'center' },
  textActionLabel: { fontFamily: fonts.uiSemi, fontSize: 16 },
})
