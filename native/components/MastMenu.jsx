import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAccount } from '../../src/lib/account.js'
import { showMainNavInMenu } from '../../src/lib/app-nav.js'
import { DIT_ENABLED } from '../../src/lib/features.js'
import { t } from '../../src/lib/i18n.js'
import { feelTap } from '../../src/lib/native.js'
import { usePeopleCount } from '../../src/lib/people.js'
import { useTheme } from '../../src/lib/prefs.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { goHash, onRoute, readRoute } from '../navigation/hash.js'
import { HEADER_BAR, useHeaderTop } from '../hooks/useHeaderSpace.js'
import { blurNativeReady } from '../lib/blur-ready.js'
import { fonts } from '../theme.js'
import { HEADER_BUTTON, HeaderButton, headerLift, headerSurface } from './HeaderButton.jsx'
import { MenuIcon } from './MenuIcon.jsx'

const HOME_ON = new Set(['/', '/home', '/tonight', '/later'])
const QUESTIONS_ON = new Set(['/lamps', '/add', '/hang', '/lamp', '/search', '/ideas'])
const EVERYONE_ON = new Set(['/everyone'])
const PEOPLE_ON = new Set(['/people', '/people/connect', '/people/refer', '/friends', '/family', '/inbox', '/sent'])
const ADD_ON = new Set(['/add', '/hang'])
const SETTINGS_ON = new Set(['/settings', '/settings/phone', '/pings', '/about', '/help', '/privacy', '/terms'])

const MastMenuCtx = createContext(null)

function menuItems(showAdd, waiting) {
  const path = readRoute().path
  const items = []
  if (showMainNavInMenu(path)) {
    items.push(
      { key: 'home', path: '/tonight', label: t('nav.home'), on: HOME_ON.has(path), icon: 'home', stroke: true },
      {
        key: 'questions',
        path: '/lamps',
        label: t('nav.questions'),
        on: QUESTIONS_ON.has(path),
        icon: 'boards',
        stroke: true,
      },
    )
    if (DIT_ENABLED) {
      items.push({
        key: 'everyone',
        path: '/everyone',
        label: t('nav.everyone'),
        on: EVERYONE_ON.has(path),
        icon: 'people',
      })
    }
    items.push({ key: 'nav-divider', divider: true })
  }
  if (showAdd) {
    items.push({ key: 'add', path: '/add', label: t('tonight.add'), on: ADD_ON.has(path), icon: 'add', stroke: true })
  }
  items.push(
    {
      key: 'people',
      path: '/people',
      label: waiting ? t('people.cogWaiting', { n: waiting }) : t('people.cog'),
      on: PEOPLE_ON.has(path),
      pip: waiting > 0,
      icon: 'people',
    },
    { key: 'shop', path: '/shop', label: t('shop.cog'), on: path === '/shop', icon: 'shop' },
    { key: 'kit', path: '/kit', label: t('kit.cog'), on: path === '/kit', icon: 'collection' },
    {
      key: 'settings',
      path: '/settings',
      label: t('settings.cog'),
      on: SETTINGS_ON.has(path),
      icon: 'settings',
    },
  )
  return items
}

function menuIsOn(showAdd, waiting) {
  return menuItems(showAdd, waiting).some((item) => item.on)
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
  const top = useHeaderTop() + (HEADER_BAR - HEADER_BUTTON) / 2
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
  const { width: winW } = useWindowDimensions()
  const fallback = useFallbackAnchor()
  const anchor = measured || fallback
  const account = useAccount()
  const waiting = usePeopleCount(account.user)
  const items = menuItems(showAdd, waiting)
  const on = menuIsOn(showAdd, waiting)
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
    const timer = setTimeout(() => shut.current(), reduce ? 0 : CLOSE_MS)
    return () => clearTimeout(timer)
  }, [closing, panelH, progress, reduce])

  const bw = anchor.w
  const bh = anchor.h
  const radiusFrom = bh / 2
  const radiusTo = 22

  // Width and height ride the spring past 1, so the card swells a touch and settles.
  const cardStyle = useAnimatedStyle(() => {
    const p = progress.value
    return {
      width: Math.max(bw, interpolate(p, [0, 1], [bw, PANEL_W])),
      height: Math.max(bh, interpolate(p, [0, 1], [bh, panelH || bh])),
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
            <MenuIcon name="grid" color={on ? colors.on : colors.inkSoft} size={16} />
          </Animated.View>
          <Animated.View
            style={[styles.panel, rowsStyle]}
            onLayout={(event) => {
              const next = Math.ceil(event.nativeEvent.layout.height)
              if (next && next !== panelH) setPanelH(next)
            }}
          >
            {items.map((item) =>
              item.divider ? (
                <View key={item.key} style={[styles.divider, { backgroundColor: colors.lineSoft }]} />
              ) : (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    feelTap()
                    // A new route drops the menu at once; the current one shrinks it home.
                    close()
                    goHash(item.path)
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    item.on && { backgroundColor: colors.panel3 },
                    pressed && { backgroundColor: colors.panel2 },
                  ]}
                >
                  <View style={styles.ico}>
                    <MenuIcon
                      name={item.icon}
                      color={item.on ? colors.on : colors.inkSoft}
                      stroke={item.stroke}
                      size={18}
                    />
                  </View>
                  <Text style={[styles.label, { color: item.on ? colors.on : colors.ink }]}>{item.label}</Text>
                  {item.pip ? <View style={[styles.pip, { backgroundColor: colors.on }]} /> : null}
                </Pressable>
              ),
            )}
          </Animated.View>
          {BlurMorph && !reduce ? (
            <MorphBlur BlurView={BlurMorph} progress={progress} tint={theme === 'light' ? 'light' : 'dark'} />
          ) : null}
        </Animated.View>
      </Animated.View>
    </View>
  )
}

function useMenu() {
  const ctx = useContext(MastMenuCtx)
  if (!ctx) throw new Error('MastMenuCog outside MastMenuRoot')
  return ctx
}

export function MastMenuCog() {
  const { open, colors, showAdd, toggle } = useMenu()
  const account = useAccount()
  const waiting = usePeopleCount(account.user)
  const on = menuIsOn(showAdd, waiting)
  const button = useRef(null)

  return (
    <HeaderButton
      ref={button}
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
      label={t('mast.menu')}
      expanded={open}
    >
      <MenuIcon name="grid" color={on ? colors.on : colors.inkSoft} size={16} />
      {waiting > 0 ? <View style={[styles.menuPip, { backgroundColor: colors.on }]} /> : null}
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
    paddingVertical: 6,
    transformOrigin: 'top right',
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14, marginVertical: 4 },
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
  label: { fontFamily: fonts.ui, fontSize: 15, fontWeight: '600', flex: 1 },
  pip: { width: 8, height: 8, borderRadius: 4 },
  menuPip: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
})
