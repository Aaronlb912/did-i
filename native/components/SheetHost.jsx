import { useEffect, useState } from 'react'
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { FRIEND_CHEER_GEMS, FRIEND_CHEERS_PER_GEM } from '../../src/lib/purse.js'
import { goHash } from '../navigation/hash.js'
import { fonts } from '../theme.js'
import { DidButton, KeyButton } from './ui.jsx'

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

export function SheetHost() {
  const [sheet, setSheet] = useState(current)
  const [live, setLive] = useState(false)

  useEffect(() => {
    listen = (next) => {
      setLive(false)
      setSheet(next)
    }
    setSheet(current)
    return () => {
      listen = null
    }
  }, [])

  useEffect(() => {
    if (!sheet) return undefined
    const timer = setTimeout(() => setLive(true), 280)
    return () => clearTimeout(timer)
  }, [sheet])

  // Android back closes the sheet, like tapping outside.
  useEffect(() => {
    if (!sheet?.title) return undefined
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      sheet.onClose?.()
      return true
    })
    return () => sub.remove()
  }, [sheet])

  if (!sheet?.title || !sheet.colors) return null
  const colors = sheet.colors

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Pressable
        pointerEvents={live ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.veil }]}
        onPress={() => sheet.onClose?.()}
        accessibilityRole="button"
        accessibilityLabel={sheet.closeLabel || t('settings.neverMind')}
      />
      <View style={[styles.pop, sheet.center && styles.popCenter, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        {sheet.preview ? <View style={styles.preview}>{sheet.preview}</View> : null}
        {sheet.kicker ? <Text style={[styles.kicker, sheet.center && styles.mid, { color: colors.on }]}>{sheet.kicker}</Text> : null}
        <Text style={[styles.title, sheet.center && styles.mid, { color: colors.ink }]}>{sheet.title}</Text>
        {sheet.body ? <Text style={[styles.body, sheet.center && styles.mid, { color: colors.inkSoft }]}>{sheet.body}</Text> : null}
        {sheet.content ? <ScrollView style={styles.content}>{sheet.content}</ScrollView> : null}
        {sheet.quote ? (
          <Text style={[styles.quote, sheet.center ? styles.quoteMid : { borderLeftWidth: 3, paddingLeft: 10, borderColor: colors.on }, { color: colors.ink }]}>{sheet.quote}</Text>
        ) : null}
        <View style={[styles.row, sheet.center && styles.rowMid]}>
          {sheet.onGo ? (
            <DidButton small danger={sheet.danger} label={sheet.goLabel || t('shop.buy')} onPress={() => sheet.onGo()} colors={colors} />
          ) : null}
          {sheet.onMore ? <KeyButton label={sheet.moreLabel} onPress={() => sheet.onMore()} colors={colors} /> : null}
          {sheet.noClose ? null : (
            <KeyButton
              label={sheet.closeLabel || t('settings.neverMind')}
              onPress={() => sheet.onClose?.()}
              colors={colors}
            />
          )}
        </View>
        {sheet.onFoot ? (
          <Pressable onPress={() => sheet.onFoot()} accessibilityRole="button" hitSlop={8} style={[styles.foot, sheet.center && styles.footMid]}>
            <Text style={[styles.footText, { color: colors.inkDim }]}>{sheet.footLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
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
