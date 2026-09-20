import { StyleSheet, Text, View } from 'react-native'
import { nightProgress } from '../../src/lib/NightMeter.jsx'
import { t } from '../../src/lib/i18n.js'
import { fonts } from '../theme.js'

export function NightMeter({ due, colors }) {
  const { total, answered, ratio } = nightProgress(due)
  if (!total) return null
  return (
    <View style={styles.wrap}>
      <Text style={[styles.top, { color: colors.ink }]}>
        <Text style={styles.count}>{answered}</Text>
        <Text style={[styles.label, { color: colors.inkSoft }]}> {t('tonight.meter', { n: total })}</Text>
      </Text>
      <View style={[styles.bar, { backgroundColor: colors.panel2 }]}>
        <View
          style={[
            styles.fill,
            { backgroundColor: ratio >= 1 ? colors.on : colors.onDeep, width: `${Math.round(ratio * 100)}%` },
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginBottom: 8 },
  top: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  count: { fontWeight: '700' },
  label: { fontWeight: '400' },
  bar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
})
