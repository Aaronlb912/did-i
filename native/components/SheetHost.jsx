import { useEffect, useRef, useState } from 'react'
import { Animated, BackHandler, Keyboard, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { t } from '../../src/lib/i18n.js'
import { FRIEND_CHEER_GEMS, FRIEND_CHEERS_PER_GEM } from '../../src/lib/purse.js'
import { goHash } from '../navigation/hash.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { MOTION_MS, easeOut } from '../lib/motion.jsx'
import { fonts } from '../theme.js'
import { DidButton, KeyButton } from './ui.jsx'
import { KeyboardLift } from './KeyboardLift.jsx'

let listen = null
let current = null

export function publishSheet(next) {
  current = next
  listen?.(next)
}

// Every spend asks first: coins and gems do not come back.
export function confirmBuy(colors, { title, body, onGo }) {
  publishSheet({
    kicker: t('shop.buyKicker'),
    title,
    body,
    goLabel: t('shop.buy'),
    closeLabel: t('settings.neverMind'),
    colors,
    onClose: () => publishSheet(null),
    onGo: () => {
      publishSheet(null)
      onGo()
    },
  })
}

// "Buy 5 friend cheers?" for the Friends and family screens.
export function confirmFriendCheers(colors, onGo) {
  const cost = FRIEND_CHEER_GEMS === 1 ? t('shop.gemOne') : t('shop.gems', { n: FRIEND_CHEER_GEMS })
  confirmBuy(colors, {
    title: t('friends.cheerBuyTitle', { n: FRIEND_CHEERS_PER_GEM }),
    body: t('friends.cheerBuyBody', { cost }),
    onGo,
  })
}

export function offerMoreGems(colors) {
  publishSheet({
    title: t('gems.shortTitle'),
    body: t('gems.shortBody'),
    goLabel: t('gems.shortGo'),
    closeLabel: t('settings.neverMind'),
    colors,
    onClose: () => publishSheet(null),
    onGo: () => {
      publishSheet(null)
      goHash('/gems')
    },
  })
}

// Gem items belong to the account, so a signed-out gem buy asks to sign in.
export function askSignIn(colors) {
  publishSheet({
    title: t('shop.signInTitle'),
    body: t('shop.miss.signInGems'),
    goLabel: t('we.signIn'),
    closeLabel: t('account.stay'),
    colors,
    onClose: () => publishSheet(null),
    onGo: () => {
      publishSheet(null)
      goHash('/account')
    },
  })
}

export function SheetHost() {
  const [next, setSheet] = useState(current)
  const [live, setLive] = useState(false)
  const reduce = useReduceMotion()
  // The last sheet stays drawn while it slides out, then unmounts.
  const [sheet, setShown] = useState(current)
  const fade = useRef(new Animated.Value(0)).current
  const insets = useSafeAreaInsets()
  const wasOpen = useRef(false)

  useEffect(() => {
    if (next?.title) {
      wasOpen.current = true
      setShown(next)
      fade.stopAnimation()
      if (reduce) fade.setValue(1)
      else Animated.timing(fade, { toValue: 1, duration: MOTION_MS, easing: easeOut, useNativeDriver: true }).start()
      return undefined
    }
    // Drop the keyboard while the closing sheet's text box is still mounted.
    // Unmounting a focused box on Android leaves the keyboard up with nothing
    // behind it, and the next note box then ignores every key.
    if (wasOpen.current) Keyboard.dismiss()
    wasOpen.current = false
    if (reduce) {
      fade.setValue(0)
      setShown(null)
      return undefined
    }
    let alive = true
    Animated.timing(fade, { toValue: 0, duration: 160, easing: easeOut, useNativeDriver: true }).start(() => {
      if (alive) setShown(null)
    })
    return () => {
      alive = false
    }
  }, [next, reduce, fade])

  // The newest host takes the sheets (a native sheet screen like Add on iPhone
  // mounts its own, since it covers the app-wide one) and hands them back when it goes.
  useEffect(() => {
    const mine = (next) => {
      setLive(false)
      setSheet(next)
    }
    const before = listen
    listen = mine
    setSheet(current)
    return () => {
      if (listen === mine) listen = before
    }
  }, [])

  useEffect(() => {
    if (!next) return undefined
    const timer = setTimeout(() => setLive(true), 280)
    return () => clearTimeout(timer)
  }, [next])

  // Android back closes the sheet, like tapping outside.
  useEffect(() => {
    if (!next?.title) return undefined
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      next.onClose?.()
      return true
    })
    return () => sub.remove()
  }, [next])

  if (!sheet?.title || !sheet.colors) return null
  const colors = sheet.colors
  const closing = !next?.title
  const lift = fade.interpolate({ inputRange: [0, 1], outputRange: [sheet.bottom ? 320 : 24, 0] })

  return (
    <View style={[styles.host, sheet.bottom && styles.hostBottom]} pointerEvents={closing ? 'none' : 'box-none'}>
      {/* The veil always takes taps, so a quick tap as a sheet pops up never
          lands on Did or Nope behind it. It only closes the sheet once live. */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.veil }]}
        onPress={() => {
          if (live) sheet.onClose?.()
        }}
        accessibilityRole="button"
        accessibilityLabel={sheet.closeLabel || t('settings.neverMind')}
      />
      </Animated.View>
      {/* A sheet with a text box (a note) rises over the keyboard, buttons and all. */}
      <KeyboardLift pointerEvents="box-none" style={sheet.bottom ? styles.liftBottom : styles.lift}>
      <Animated.View
        style={[
          styles.pop,
          sheet.center && styles.popCenter,
          sheet.bottom && [styles.popBottom, { paddingBottom: 18 + insets.bottom }],
          { backgroundColor: colors.panel, borderColor: colors.line, opacity: fade, transform: [{ translateY: reduce ? 0 : lift }] },
        ]}
      >
        {sheet.bottom ? <Grabber colors={colors} onDown={() => sheet.onClose?.()} /> : null}
        {sheet.preview ? <View style={styles.preview}>{sheet.preview}</View> : null}
        {sheet.kicker ? <Text style={[styles.kicker, sheet.center && styles.mid, { color: colors.on }]}>{sheet.kicker}</Text> : null}
        <Text style={[styles.title, sheet.center && styles.mid, { color: colors.ink }]}>{sheet.title}</Text>
        {sheet.body ? <Text style={[styles.body, sheet.center && styles.mid, { color: colors.inkSoft }]}>{sheet.body}</Text> : null}
        {sheet.content ? <ScrollView ref={sheet.scrollRef} style={sheet.bottom ? styles.contentBottom : styles.content} keyboardShouldPersistTaps="handled">{sheet.content}</ScrollView> : null}
        {sheet.quote ? (
          <Text style={[styles.quote, sheet.center ? styles.quoteMid : { borderLeftWidth: 3, paddingLeft: 10, borderColor: colors.on }, { color: colors.ink }]}>{sheet.quote}</Text>
        ) : null}
        {/* A sheet that removes something: the safe choice is the filled button,
            the destructive one is a plain button in red. */}
        <View style={[styles.row, sheet.center && styles.rowMid]}>
          {sheet.danger && sheet.onGo && !sheet.noClose ? (
            <>
              <DidButton small label={sheet.closeLabel || t('settings.neverMind')} onPress={() => sheet.onClose?.()} colors={colors} />
              {sheet.onMore ? <MoreButton sheet={sheet} colors={colors} /> : null}
              <KeyButton danger label={sheet.goLabel || t('shop.buy')} onPress={() => sheet.onGo()} colors={colors} />
            </>
          ) : (
            <>
              {sheet.onGo ? (
                <DidButton small danger={sheet.danger} disabled={Boolean(sheet.goDisabled)} label={sheet.goLabel || t('shop.buy')} onPress={() => sheet.onGo()} colors={colors} />
              ) : null}
              {sheet.onMore ? <MoreButton sheet={sheet} colors={colors} /> : null}
              {sheet.noClose ? null : (
                <KeyButton
                  label={sheet.closeLabel || t('settings.neverMind')}
                  onPress={() => sheet.onClose?.()}
                  colors={colors}
                />
              )}
            </>
          )}
        </View>
        {sheet.onFoot ? (
          <View style={[styles.foot, sheet.center && styles.footMid]}>
            <KeyButton colors={colors} label={sheet.footLabel} onPress={() => sheet.onFoot()} />
          </View>
        ) : null}
      </Animated.View>
      </KeyboardLift>
    </View>
  )
}

// The handle on a bottom sheet: a drag down closes it, like the phone's own sheets.
function Grabber({ colors, onDown }) {
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 6,
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 40) onDown()
      },
    }),
  ).current
  return (
    <View {...pan.panHandlers} style={styles.grabArea} accessibilityElementsHidden importantForAccessibility="no">
      <View style={[styles.grabber, { backgroundColor: colors.line }]} />
    </View>
  )
}

// moreSizeLabels: every label the button can show. Hidden copies set its
// width to the widest, so a label change never moves the buttons beside it.
function MoreButton({ sheet, colors }) {
  return (
    <View>
      {(sheet.moreSizeLabels || []).map((label) => (
        <View key={label} style={styles.ghost} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <KeyButton label={label} colors={colors} />
        </View>
      ))}
      <KeyButton label={sheet.moreLabel} onPress={() => sheet.onMore()} colors={colors} />
    </View>
  )
}

const styles = StyleSheet.create({
  ghost: { height: 0, opacity: 0, overflow: 'hidden' },
  host: {
    ...StyleSheet.absoluteFill,
    zIndex: 180,
    elevation: 36,
    justifyContent: 'center',
    padding: 20,
  },
  pop: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  preview: { alignItems: 'center', marginBottom: 2 },
  lift: { justifyContent: 'center' },
  // bottom: the sheet rises from the bottom edge, like the sketch's When picker.
  hostBottom: { justifyContent: 'flex-end', padding: 0 },
  liftBottom: { justifyContent: 'flex-end' },
  popBottom: { borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 0, maxHeight: '88%' },
  contentBottom: { flexGrow: 0, flexShrink: 1 },
  grabArea: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 10 },
  grabber: { width: 36, height: 5, borderRadius: 3 },
  content: { maxHeight: 320 },
  title: { fontFamily: fonts.display, fontSize: 22, fontWeight: '700' },
  body: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  quote: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, fontStyle: 'italic' },
  quoteMid: { textAlign: 'center' },
  popCenter: { alignItems: 'stretch' },
  mid: { textAlign: 'center' },
  rowMid: { justifyContent: 'center' },
  footMid: { alignSelf: 'center' },
  foot: { alignSelf: 'flex-start' },
})
