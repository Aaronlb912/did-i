import { useEffect, useRef } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { shortCount } from '../../src/lib/wallet.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { goHash } from '../navigation/hash.js'
import { usePop } from '../hooks/usePop.js'
import { fonts } from '../theme.js'
import { CoinIcon, GemIcon } from './PurseIcons.jsx'
import { openCoinsHow } from './NightSheets.jsx'

export function PurseLine({ purse, colors, gemsLink = false, mast = false }) {
  const reduce = useReduceMotion()
  const coins = Math.max(0, Math.floor(Number(purse?.coins) || 0))
  const gems = Math.max(0, Math.floor(Number(purse?.gems) || 0))
  const pop = usePop(coins + gems)
  const scale = useRef(new Animated.Value(1)).current
  const iconSize = mast ? 15 : 16
  const numColor = mast ? colors.on : colors.inkSoft

  useEffect(() => {
    if (reduce || !pop) return
    const bump = pop === 'is-pop' ? 1.1 : 0.94
    scale.setValue(1)
    Animated.sequence([
      Animated.timing(scale, { toValue: bump, duration: 120, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start()
  }, [pop, reduce, scale])

  const gemBody = (
    <>
      <GemIcon size={iconSize} />
      <Text style={[styles.n, mast && styles.nMast, { color: numColor }]}>{shortCount(gems)}</Text>
    </>
  )

  return (
    <Animated.View style={[styles.row, mast && styles.rowMast, { transform: [{ scale }] }]}>
      <Pressable
        onPress={() => openCoinsHow(colors)}
        style={styles.bit}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={t('coins.tapAria')}
      >
        <CoinIcon size={iconSize} />
        <Text style={[styles.n, mast && styles.nMast, { color: numColor }]}>{shortCount(coins)}</Text>
      </Pressable>
      {mast ? null : <Text style={[styles.sep, { color: colors.line }]}>·</Text>}
      {gemsLink ? (
        <Pressable
          onPress={() => goHash('/gems')}
          style={styles.bit}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t('gems.title')}
        >
          {gemBody}
        </Pressable>
      ) : (
        <View style={styles.bit}>{gemBody}</View>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowMast: { gap: 4 },
  bit: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sep: { fontFamily: fonts.mono, fontSize: 11 },
  n: { fontFamily: fonts.mono, fontSize: 11 },
  nMast: { fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: '600' },
})
