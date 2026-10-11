import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { weekStripNights, weekdayName } from '../../src/lib/hall-pages.js'
import { t } from '../../src/lib/i18n.js'
import { usePrefs } from '../../src/lib/prefs.js'
import { goHash } from '../navigation/hash.js'
import { fonts } from '../theme.js'
import { Reveal, useLayoutState } from '../lib/motion.jsx'

export function WeekStrip({ boards = [], tagId = '', now, colors }) {
  const clock = now || new Date()
  const prefs = usePrefs()
  const gentle = prefs.gentle === true
  const locale = prefs.locale
  const [weekShift, setWeekShift] = useLayoutState(0)
  useEffect(() => {
    setWeekShift(0)
  }, [tagId])
  const nights = weekStripNights(boards, clock, tagId, weekShift)
  const label = t('weekbar.week')

  return (
    <View style={[styles.wrap, { borderTopColor: colors.lineSoft }]}>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('weekbar.prev')} onPress={() => setWeekShift((n) => n - 1)} hitSlop={8} style={styles.shiftBtn}>
          <Text style={[styles.shift, { color: colors.inkSoft }]}>‹</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => goHash('/calendar')} style={styles.labelHit}>
          <Text style={[styles.open, { color: colors.inkSoft }]}>{label}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('weekbar.next')}
          accessibilityState={{ disabled: weekShift >= 0 }}
          disabled={weekShift >= 0}
          onPress={() => setWeekShift((n) => Math.min(0, n + 1))}
          hitSlop={8}
          style={styles.shiftBtn}
        >
          <Text style={[styles.shift, { color: weekShift >= 0 ? colors.line : colors.inkSoft }]}>›</Text>
        </Pressable>
      </View>
      <Reveal key={`w${weekShift}`} style={styles.days} exiting={undefined} layout={false}>
        {nights.map((night) => (
          <View key={night.iso} style={styles.day}>
            <Text style={[styles.dayLabel, { color: night.isToday ? colors.on : colors.inkDim }]}>{weekdayName(night.iso, 'narrow', locale)}</Text>
            <View style={styles.dotWrap}>
              {night.isToday && night.on ? (
                <View style={[styles.todayRing, { borderColor: colors.on }]} />
              ) : null}
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: night.on ? colors.on : night.freeze ? 'transparent' : night.miss && !gentle ? colors.miss : colors.open,
                    // A freeze is a ring, the same as the history legend.
                    ...(night.freeze && !night.on ? { borderWidth: 1.5, borderColor: colors.freeze } : null),
                    opacity: night.empty ? 0.35 : 1,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </Reveal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 6,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shiftBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  shift: { fontSize: 20, lineHeight: 22 },
  labelHit: { flex: 1, alignItems: 'center' },
  open: { fontFamily: fonts.uiSemi, fontSize: 12.5 },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 4, flex: 1 },
  dayLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.4 },
  dotWrap: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  todayRing: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    opacity: 0.85,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
})
