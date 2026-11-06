import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAccount } from '../../src/lib/account.js'
import { t } from '../../src/lib/i18n.js'
import { feelTap } from '../../src/lib/native.js'
import { usePeoplePulse } from '../../src/lib/people.js'
import { setAppBadge } from '../../src/lib/push.js'
import { useNotices } from '../../src/lib/notices.js'
import { useWeTonight } from '../../src/lib/did-we.js'
import { useTheme } from '../../src/lib/prefs.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { goFromMenu, onRoute, readRoute } from '../navigation/hash.js'
import { HEADER_BAR, useHeaderBottom } from '../hooks/useHeaderSpace.js'
import { blurNativeReady } from '../lib/blur-ready.js'
import { ripple } from '../lib/ripple.js'
import { fonts, sectionLabel } from '../theme.js'
import { HEADER_BUTTON, HeaderButton, headerLift, headerSurface } from './HeaderButton.jsx'
import { menuIsOn, menuItems } from './mast-menu-items.js'
import { openStore, useUpdateOffered } from './UpdatePrompt.jsx'
import { MenuIcon } from './MenuIcon.jsx'
import { useTourTarget } from '../lib/tour.js'

const MastMenuCtx = createContext(null)

function countLabel(n) {
  return n > 9 ? '9+' : String(n)
}

function useMenuPeople() {
  const account = useAccount()
  const { inbox, asks, gifts = 0 } = usePeoplePulse(account.user)
  const { cards } = useWeTonight(account.user)
  // Did we: asks to join only. A shared question waiting on tonight's answer
  // is a Tonight card, not something Friends and family has to show.
  const we = cards.filter((card) => card.myState === 'asked').length
  // A gift not opened yet counts too, until sync opens it.
  return { inbox, asks, we: we + gifts, signedIn: Boolean(account.user) }
}

// The grid button grows into the menu card and shrinks back into it.
// One progress value p drives the whole morph: 0 is the button, 1 the card.
const PANEL_W = 256
const OPEN_SPRING = { damping: 24, stiffness: 260, mass: 1 }
const CLOSE_MS = 280
const CLOSE_EASE = Easing.bezier(0.4, 0, 0.2, 1)
const REST_MS = 420
const MORPH_BLUR = 28

function clamp01(value) {
  'worklet'
  return Math.min(1, Math.max(0, value))
}

let blurMorph

/** Animated iOS blur for the morph, or null when blur or Reanimated is missing. */
function loadBlurMorph() {
  if (blurMorph !== undefined) return blurMorph
  blurMorph = null
  if (Platform.OS !== 'ios' || !blurNativeReady() || typeof useAnimatedProps !== 'function') return blurMorph
  try {
    const BlurView = require('expo-blur').BlurView
    if (BlurView && Animated && typeof Animated.createAnimatedComponent === 'function') {
      blurMorph = Animated.createAnimatedComponent(BlurView)
    }
  } catch {
    blurMorph = null
  }
  return blurMorph
}

export function MastMenuRoot({ colors, showAdd = true, children }) {
  // closed: nothing mounted. open: card out. closing: card shrinking home.
  const [phase, setPhase] = useState('closed')
  const [anchor, setAnchor] = useState(null)
  const open = phase !== 'closed'

  const close = useCallback(() => setPhase((live) => (live === 'open' ? 'closing' : live)), [])
  const drop = useCallback(() => setPhase('closed'), [])
  const toggle = useCallback((at) => {
    setAnchor(at || null)
    setPhase((live) => (live === 'open' ? 'closing' : 'open'))
  }, [])

  // A new screen replaces the old one, so there is nothing to shrink back into.
  useEffect(() => {
    let path = readRoute().path
    return onRoute((route) => {
      if (route.path === path) return
      path = route.path
      drop()
    })
  }, [drop])

  const value = useMemo(
    () => ({ open: phase === 'open', colors, showAdd, close, toggle }),
    [phase, colors, showAdd, close, toggle],
  )

  useEffect(() => {
    if (phase !== 'open') return undefined
    function onBack(event) {
      close()
      event?.preventDefault?.()
    }
    window.addEventListener('did-i-back', onBack)
    return () => window.removeEventListener('did-i-back', onBack)
  }, [phase, close])

  return (
    <MastMenuCtx.Provider value={value}>
      <View style={styles.root}>{children}</View>
      {open ? (
        <Modal
          visible
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={close}
        >
          <MastMenuSheet
            colors={colors}
            showAdd={showAdd}
            anchor={anchor}
            closing={phase === 'closing'}
            close={close}
            onClosed={drop}
          />
        </Modal>
      ) : null}
    </MastMenuCtx.Provider>
  )
}

/** Where the grid button sits when it could not be measured. */
function useFallbackAnchor() {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const top = useHeaderBottom() - HEADER_BAR + (HEADER_BAR - HEADER_BUTTON) / 2
  const right = Math.max(16, insets.right + 16)
  return { x: width - right - HEADER_BUTTON, y: top, w: HEADER_BUTTON, h: HEADER_BUTTON }
}

function MorphBlur({ BlurView, progress, tint }) {
  // Peaks halfway so the button icon and the rows each pass through it, and
  // both ends of the morph stay sharp.
  const blurProps = useAnimatedProps(() => ({
    intensity: MORPH_BLUR * Math.sin(Math.PI * clamp01(progress.value)),
  }))
  return <BlurView pointerEvents="none" tint={tint} animatedProps={blurProps} style={StyleSheet.absoluteFill} />
}

function MastMenuSheet({ colors, showAdd, anchor: measured, closing, close, onClosed }) {
  const { width: winW, height: winH } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const fallback = useFallbackAnchor()
  // A cold launch can hand back a measurement from before layout has
  // settled, placing the button above the safe area (over the status bar).
  // The safe-area anchor is a better guess than trusting that number.
  const anchor = measured && measured.y >= insets.top ? measured : fallback
  const people = useMenuPeople()
  const notices = useNotices()
  const updateOut = useUpdateOffered()
  const items = menuItems(showAdd, people.inbox, people.asks, people.signedIn, people.we, notices.unseen)
  // A newer version in the store: a row right under Home until it is installed.
  if (updateOut) items.splice(1, 0, { key: 'update', label: t('update.menuRow'), icon: 'update', stroke: true, accent: 'on', action: openStore })
  const on = menuIsOn(items)
  const reduce = useReduceMotion()
  const theme = useTheme()
  const BlurMorph = loadBlurMorph()
  const [live, setLive] = useState(false)
  const [panelH, setPanelH] = useState(0)
  const progress = useSharedValue(0)
  const shut = useRef(onClosed)
  shut.current = onClosed

  useEffect(() => {
    const timer = setTimeout(() => setLive(true), REST_MS)
    return () => clearTimeout(timer)
  }, [])

  // Grow once the card knows its height; shrink when asked, then unmount on a
  // timer so a missing Reanimated (whose animations never call back) still closes.
  useEffect(() => {
    if (!panelH) return undefined
    if (!closing) {
      progress.value = reduce ? 1 : withSpring(1, OPEN_SPRING)
      return undefined
    }
    progress.value = reduce ? 0 : withTiming(0, { duration: CLOSE_MS, easing: CLOSE_EASE })
    // Stop the animation before the Modal unmounts; a spring still running on
    // views that are gone floods the UI thread with failed updates and freezes the app.
    const timer = setTimeout(() => {
      cancelAnimation(progress)
      shut.current()
    }, reduce ? 0 : CLOSE_MS)
    return () => clearTimeout(timer)
  }, [closing, panelH, progress, reduce])

  useEffect(() => () => cancelAnimation(progress), [progress])

  const bw = anchor.w
  const bh = anchor.h
  // Small phones, big text and split screen: the card ends above the nav bar.
  const room = Math.max(bh * 4, winH - anchor.y - insets.bottom - 12)
  const cardH = Math.min(panelH, room)
  const radiusFrom = bh / 2
  const radiusTo = 22

  // Width and height ride the spring past 1, so the card swells a touch and settles.
  const cardStyle = useAnimatedStyle(() => {
    const p = progress.value
    return {
      width: Math.max(bw, interpolate(p, [0, 1], [bw, PANEL_W])),
      height: Math.max(bh, interpolate(p, [0, 1], [bh, cardH || bh])),
      borderRadius: interpolate(clamp01(p), [0, 1], [radiusFrom, radiusTo]),
    }
  })
  const veilStyle = useAnimatedStyle(() => ({ opacity: clamp01(progress.value) }))
  const iconStyle = useAnimatedStyle(() => {
    const out = clamp01(progress.value / 0.35)
    return { opacity: 1 - out, transform: [{ scale: 1 - out * 0.4 }, { rotate: `${out * 45}deg` }] }
  })
  const rowsStyle = useAnimatedStyle(() => {
    const p = progress.value
    const show = clamp01((p - 0.2) / 0.65)
    return {
      opacity: show,
      transform: [{ translateY: (1 - clamp01(p)) * -8 }, { scale: 0.94 + 0.06 * clamp01(p) }],
    }
  })

  const cardPlace = {
    top: anchor.y,
    right: Math.max(0, winW - anchor.x - anchor.w),
    borderColor: on ? colors.onDeep : colors.lineSoft,
  }

  return (
    <View style={styles.modalFill}>
      <Animated.View style={[StyleSheet.absoluteFill, veilStyle]}>
        <Pressable
          pointerEvents={live ? 'auto' : 'none'}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.veil }]}
          onPress={close}
          accessibilityLabel={t('mast.menuClose')}
          accessibilityRole="button"
        />
      </Animated.View>
      <Animated.View
        pointerEvents={closing ? 'none' : 'box-none'}
        style={[styles.card, headerSurface(colors), cardPlace, cardStyle]}
      >
        <Animated.View style={[styles.clip, cardStyle]}>
          <Animated.View
            pointerEvents="none"
            style={[styles.collapsed, { width: bw, height: bh }, iconStyle]}
          >
            <MenuIcon name="grid" color={colors.on} size={16} />
          </Animated.View>
          <Animated.View style={[styles.panel, { maxHeight: room }, rowsStyle]}>
          <ScrollView bounces={false} scrollEnabled={panelH > room} showsVerticalScrollIndicator={panelH > room}>
          <View
            style={styles.rows}
            onLayout={(event) => {
              const next = Math.ceil(event.nativeEvent.layout.height)
              if (next && next !== panelH) setPanelH(next)
            }}
          >
            {items.map((item) =>
              item.section ? (
                <View key={item.key} style={[styles.section, { borderTopColor: colors.lineSoft }]}>
                  <Text style={[styles.sectionText, { color: colors.inkSoft }]}>{item.label}</Text>
                </View>
              ) : item.divider ? (
                <View key={item.key} style={[styles.divider, { backgroundColor: colors.lineSoft }]} />
              ) : (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={item.a11y || item.label}
                  accessibilityState={{ selected: Boolean(item.on) }}
                  onPress={() => {
                    // Navigate first so the screen starts at once; a new route
                    // drops the menu, the current one shrinks it home.
                    if (item.action) item.action()
                    else goFromMenu(item.path)
                    close()
                    feelTap()
                  }}
                  android_ripple={ripple(colors.panel3)}
                  style={({ pressed }) => [
                    styles.row,
                    item.on && { backgroundColor: colors.panel3 },
                    pressed && { backgroundColor: colors.panel2 },
                  ]}
                >
                  <View style={styles.ico}>
                    <MenuIcon
                      name={item.icon}
                      color={item.accent ? colors[item.accent] : item.on ? colors.on : colors.inkSoft}
                      stroke={item.stroke}
                      size={18}
                    />
                  </View>
                  <Text style={[styles.label, { color: item.on ? colors.on : colors.ink }]}>{item.label}</Text>
                  {item.count > 0 ? (
                    <View style={[styles.count, { backgroundColor: item.accent ? colors[item.accent] : colors.on }]}>
                      <Text style={[styles.countText, { color: colors.bg }]}>{countLabel(item.count)}</Text>
                    </View>
                  ) : null}
                </Pressable>
              ),
            )}
          </View>
          </ScrollView>
          </Animated.View>
          {BlurMorph && !reduce ? (
            <MorphBlur BlurView={BlurMorph} progress={progress} tint={theme === 'light' ? 'light' : 'dark'} />
          ) : null}
        </Animated.View>
      </Animated.View>
    </View>
  )
}

/** The menu a screen's MastMenuRoot provides, for header items rendered outside it. */
export function useMastMenu() {
  return useContext(MastMenuCtx)
}

/** Re-provides a screen's menu to a header item the native header renders elsewhere. */
export function MastMenuBridge({ value, children }) {
  return <MastMenuCtx.Provider value={value}>{children}</MastMenuCtx.Provider>
}

function useMenu() {
  const ctx = useContext(MastMenuCtx)
  if (!ctx) throw new Error('MastMenuCog outside MastMenuRoot')
  return ctx
}

export function MastMenuCog() {
  const { open, colors, showAdd, toggle } = useMenu()
  const people = useMenuPeople()
  const waiting = people.inbox + people.asks + people.we
  // The home screen icon shows the same number as this button, or none.
  useEffect(() => {
    setAppBadge(waiting)
  }, [waiting])
  // A push sets the icon to 1 while the app is away; opening it sets it back.
  const waitingNow = useRef(waiting)
  waitingNow.current = waiting
  useEffect(() => {
    setAppBadge(waitingNow.current, true)
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setAppBadge(waitingNow.current, true)
    })
    return () => sub.remove()
  }, [])
  // (Did we's count shows through Friends and family.)
  const on = menuIsOn(menuItems(showAdd, people.inbox, people.asks, people.signedIn, people.we))
  const button = useRef(null)
  const tour = useTourTarget('menu')

  return (
    <HeaderButton
      ref={(node) => {
        button.current = node
        tour.ref(node)
      }}
      bare
      colors={colors}
      on={on}
      onPress={() => {
        feelTap()
        const node = button.current
        if (!node || typeof node.measureInWindow !== 'function') {
          toggle(null)
          return
        }
        node.measureInWindow((x, y, w, h) => toggle(w > 0 && h > 0 ? { x, y, w, h } : null))
      }}
      label={people.inbox ? t('didyou.menuButton', { n: people.inbox }) : t('mast.button')}
      expanded={open}
    >
      <MenuIcon name="grid" color={colors.on} size={16} />
      {people.inbox > 0 ? (
        <View pointerEvents="none" style={[styles.menuCount, { backgroundColor: colors.on, borderColor: colors.bg }]}>
          <Text style={[styles.countText, styles.menuCountText, { color: colors.bg }]}>{countLabel(people.inbox)}</Text>
        </View>
      ) : waiting > 0 ? (
        <View style={[styles.menuPip, { backgroundColor: colors.on }]} />
      ) : null}
    </HeaderButton>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  modalFill: { flex: 1 },
  card: {
    ...headerLift,
    position: 'absolute',
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 20,
  },
  clip: { position: 'absolute', top: 0, right: 0, overflow: 'hidden' },
  collapsed: {
    position: 'absolute',
    top: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: PANEL_W,
    transformOrigin: 'top right',
  },
  rows: { paddingVertical: 6 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14, marginVertical: 4 },
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
    marginTop: 4,
    paddingTop: 10,
    paddingBottom: 4,
  },
  sectionText: { ...sectionLabel },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 6,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ico: { width: 22, alignItems: 'center' },
  label: { fontFamily: fonts.uiSemi, fontSize: 15, flex: 1 },
  count: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontFamily: fonts.mono, fontSize: 11, fontWeight: '700' },
  menuCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCountText: { fontSize: 11, lineHeight: 12, includeFontPadding: false, textAlign: 'center' },
  menuPip: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
})
