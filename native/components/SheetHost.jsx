import { useEffect, useRef, useState } from 'react'
import { Animated, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
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

  useEffect(() => {
    if (next?.title) {
      setShown(next)
      fade.stopAnimation()
      if (reduce) fade.setValue(1)
      else Animated.timing(fade, { toValue: 1, duration: MOTION_MS, easing: easeOut, useNativeDriver: true }).start()
      return undefined
    }
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
  const lift = fade.interpolate({ inputRange: [0, 1], outputRange: [24, 0] })

  return (
    <View style={styles.host} pointerEvents={closing ? 'none' : 'box-none'}>
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
      <KeyboardLift pointerEvents="box-none" style={styles.lift}>
      <Animated.View
        style={[
          styles.pop,
          sheet.center && styles.popCenter,
          { backgroundColor: colors.panel, borderColor: colors.line, opacity: fade, transform: [{ translateY: reduce ? 0 : lift }] },
        ]}
      >
        {sheet.preview ? <View style={styles.preview}>{sheet.preview}</View> : null}
        {sheet.kicker ? <Text style={[styles.kicker, sheet.center && styles.mid, { color: colors.on }]}>{sheet.kicker}</Text> : null}
        <Text style={[styles.title, sheet.center && styles.mid, { color: colors.ink }]}>{sheet.title}</Text>
        {sheet.body ? <Text style={[styles.body, sheet.center && styles.mid, { color: colors.inkSoft }]}>{sheet.body}</Text> : null}
        {sheet.content ? <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">{sheet.content}</ScrollView> : null}
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
          <Pressable onPress={() => sheet.onFoot()} accessibilityRole="button" hitSlop={8} style={[styles.foot, sheet.center && styles.footMid]}>
            <Text style={[styles.footText, { color: colors.inkDim }]}>{sheet.footLabel}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
      </KeyboardLift>
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
  footText: { fontFamily: fonts.ui, fontSize: 13, textDecorationLine: 'underline' },
})
