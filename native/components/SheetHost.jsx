import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { goHash } from '../navigation/hash.js'
import { fonts } from '../theme.js'
import { DidButton, KeyButton } from './ui.jsx'

let listen = null
let current = null

export function publishSheet(next) {
  current = next
  listen?.(next)
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
      <View style={[styles.pop, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        {sheet.preview ? <View style={styles.preview}>{sheet.preview}</View> : null}
        {sheet.kicker ? <Text style={[styles.kicker, { color: colors.on }]}>{sheet.kicker}</Text> : null}
        <Text style={[styles.title, { color: colors.ink }]}>{sheet.title}</Text>
        {sheet.body ? <Text style={[styles.body, { color: colors.inkSoft }]}>{sheet.body}</Text> : null}
        <View style={styles.row}>
          {sheet.onGo ? (
            <DidButton small label={sheet.goLabel || t('shop.buy')} onPress={() => sheet.onGo()} colors={colors} />
          ) : null}
          <KeyButton
            label={sheet.closeLabel || t('settings.neverMind')}
            onPress={() => sheet.onClose?.()}
            colors={colors}
          />
        </View>
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
  title: { fontFamily: fonts.display, fontSize: 22, fontWeight: '700' },
  body: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
})
