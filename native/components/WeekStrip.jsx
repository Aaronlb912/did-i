import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { shelfHeat } from '../../src/lib/hall-feel.js'
import { weekStripNights } from '../../src/lib/hall-pages.js'
import { t } from '../../src/lib/i18n.js'
import { goHash } from '../navigation/hash.js'
import { fonts } from '../theme.js'

export function WeekStrip({ boards = [], tagId = '', now, colors }) {
  const clock = now || new Date()
  const [weekShift, setWeekShift] = useState(0)
  useEffect(() => {
    setWeekShift(0)
  }, [tagId])
  const nights = weekStripNights(boards, clock, tagId, weekShift)
  const heat = shelfHeat(boards, clock, tagId)
  const label = heat > 0 ? t('weekbar.streak', { n: heat }) : t('weekbar.none')

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Pressable onPress={() => setWeekShift((n) => n - 1)} hitSlop={8}>
          <Text style={[styles.shift, { color: colors.inkDim }]}>‹</Text>
        </Pressable>
        <Pressable onPress={() => goHash('/calendar')}>
          <Text style={[styles.open, { color: colors.ink }]}>{label}</Text>
        </Pressable>
        <Pressable disabled={weekShift >= 0} onPress={() => setWeekShift((n) => Math.min(0, n + 1))} hitSlop={8}>
          <Text style={[styles.shift, { color: weekShift >= 0 ? colors.line : colors.inkDim }]}>›</Text>
        </Pressable>
      </View>
      <View style={styles.days}>
        {nights.map((night) => (
          <View key={night.iso} style={styles.day}>
            <Text style={[styles.dayLabel, { color: night.isToday ? colors.on : colors.inkDim }]}>{night.weekday[0]}</Text>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: night.on ? colors.on : night.miss ? colors.miss : colors.open,
                  opacity: night.empty ? 0.35 : 1,
                },
              ]}
            />
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, marginBottom: 4, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shift: { fontSize: 20, paddingHorizontal: 8 },
  open: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 4, flex: 1 },
  dayLabel: { fontFamily: fonts.mono, fontSize: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
})
