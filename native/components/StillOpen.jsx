import { Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { clockWords } from '../../src/lib/hall-pages.js'
import { faceCardStyles } from '../lib/face-card.js'
import { fonts } from '../theme.js'

/**
 * What is left after a nope: each noped question as a slim row with its own
 * way out. "Did it now" saves it as late; "Keep nope" lets the nope stand and
 * takes it off the list. Either can still change until the grace period ends.
 */
export function StillOpen({ rows, rowKey, colors, onLate, onLeave }) {
  return (
    <View>
      <Text style={[faceCardStyles.kicker, { color: colors.on }]}>{t('tonight.finishKicker')}</Text>
      <Text style={[faceCardStyles.title, { color: colors.ink }]}>
        {rows.length === 1
          ? t('tonight.nopedOne', { question: rows[0].lamp.question })
          : t('tonight.nopedMany', { n: rows.length })}
      </Text>
      <Text style={[faceCardStyles.meta, { color: colors.inkSoft }]}>
        {t('tonight.nopedChange', { time: clockWords('09:00') })}
      </Text>
      <View style={styles.list}>
        {rows.map((row) => (
          <View key={rowKey(row)} style={[styles.row, { backgroundColor: colors.panel2, borderColor: colors.line }]}>
            <View style={styles.head}>
              <View style={[styles.dot, { backgroundColor: colors.skip }]} />
              <Text style={[styles.question, { color: colors.ink }]} numberOfLines={2}>
                {row.lamp.question}
              </Text>
            </View>
            <View style={styles.actions}>
              <Pressable
                onPress={() => onLeave(row)}
                accessibilityRole="button"
                accessibilityLabel={`${t('tonight.keepNope')}: ${row.lamp.question}`}
                hitSlop={6}
                style={({ pressed }) => [styles.action, styles.leave, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.actionText, { color: colors.inkSoft }]}>{t('tonight.keepNope')}</Text>
              </Pressable>
              <Pressable
                onPress={() => onLate(row)}
                accessibilityRole="button"
                accessibilityLabel={`${t('tonight.didItNow')}: ${row.lamp.question}`}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: colors.on, borderColor: colors.on, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={[styles.actionText, { color: colors.bg }]}>{t('tonight.didItNow')}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: 10, marginTop: 16 },
  row: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  question: { flex: 1, fontFamily: fonts.uiSemi, fontSize: 16, lineHeight: 21 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  action: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leave: { borderColor: 'transparent' },
  actionText: { fontFamily: fonts.uiBold, fontSize: 14 },
})
