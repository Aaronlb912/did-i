import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { ACHIEVEMENTS, MARK_SECTIONS, markLabel } from '../../src/lib/achievements.js'
import { t } from '../../src/lib/i18n.js'
import { LOCK_PATH, markIconPath } from '../../src/lib/mark-icons.js'
import { svgParts } from '../lib/svg-parts.js'
import { fonts, sectionLabel } from '../theme.js'

const GAP = 10

function Glyph({ d, color, size = 20 }) {
  const parts = svgParts()
  if (!parts) return null
  const { Svg, Path } = parts
  return (
    <Svg pointerEvents="none" width={size} height={size} viewBox="0 0 24 24">
      <Path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function Tile({ item, on, width, colors }) {
  return (
    <View
      accessible
      accessibilityLabel={
        on
          ? `${markLabel(item.id, 'name')}. ${markLabel(item.id, 'line')}`
          : `${t('marks.notYet')}: ${markLabel(item.id, 'name')}. ${markLabel(item.id, 'how')}`
      }
      style={[
        styles.tile,
        width ? { width } : null,
        {
          backgroundColor: on ? colors.panel : colors.bg,
          borderColor: on ? colors.onDeep : colors.lineSoft || colors.line,
        },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: on ? colors.on : colors.panel2 }]}>
        <Glyph d={on ? markIconPath(item.id) : LOCK_PATH} color={on ? colors.bg : colors.inkDim} />
      </View>
      <Text style={[styles.name, { color: on ? colors.ink : colors.inkSoft }]} numberOfLines={2}>
        {markLabel(item.id, 'name')}
      </Text>
      <Text style={[styles.line, { color: on ? colors.inkSoft : colors.inkDim }]} numberOfLines={3}>
        {on ? markLabel(item.id, 'line') : markLabel(item.id, 'how')}
      </Text>
    </View>
  )
}

// A count across the top, then one block per kind of achievement, earned
// first in each. Two across on a phone, three on a wide screen.
export function MarksGrid({ have, colors }) {
  const [width, setWidth] = useState(0)
  const cols = width >= 560 ? 3 : 2
  const tile = width ? Math.floor((width - GAP * (cols - 1)) / cols) : 0
  const count = ACHIEVEMENTS.filter((item) => have.has(item.id)).length
  const total = ACHIEVEMENTS.length

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={[styles.summary, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        <View style={styles.summaryRow} accessible accessibilityLabel={t('marks.count', { n: count, total })}>
          <Text style={[styles.count, { color: colors.on }]}>{count}</Text>
          <Text style={[styles.of, { color: colors.inkDim }]}>/ {total}</Text>
          <Text style={[styles.countCap, { color: colors.inkSoft }]}>{t('marks.countCap')}</Text>
        </View>
        <View style={[styles.track, { backgroundColor: colors.panel2 }]}>
          <View style={[styles.fill, { backgroundColor: colors.on, width: `${total ? (count / total) * 100 : 0}%` }]} />
        </View>
      </View>

      {MARK_SECTIONS.map((section) => {
        const items = ACHIEVEMENTS.filter((item) => item.section === section)
        if (!items.length) return null
        const got = items.filter((item) => have.has(item.id))
        const rest = items.filter((item) => !have.has(item.id))
        return (
          <View key={section} style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={[sectionLabel, styles.sectionName, { color: colors.inkSoft }]} accessibilityRole="header">
                {t(`marks.section.${section}`)}
              </Text>
              <Text style={[styles.sectionCount, { color: colors.inkDim }]}>
                {got.length} / {items.length}
              </Text>
            </View>
            <View style={styles.grid} accessibilityRole="list">
              {[...got, ...rest].map((item) => (
                <Tile key={item.id} item={item} on={have.has(item.id)} width={tile} colors={colors} />
              ))}
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  summary: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12, marginBottom: 18 },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  count: { fontFamily: fonts.display, fontSize: 34, fontWeight: '700', lineHeight: 38 },
  of: { fontFamily: fonts.display, fontSize: 18 },
  countCap: { fontFamily: fonts.ui, fontSize: 14, marginLeft: 4 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  section: { marginBottom: 20 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  sectionName: { flexShrink: 1 },
  sectionCount: { fontFamily: fonts.mono, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tile: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8, minHeight: 150 },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.uiBold, fontSize: 15, lineHeight: 20 },
  line: { fontFamily: fonts.ui, fontSize: 12.5, lineHeight: 17 },
})
