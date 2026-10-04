import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { usePrefs } from '../../src/lib/prefs.js'
import { boardDate, isoDate, parseIsoDate } from '../../src/lib/recurrence.js'
import { fonts } from '../theme.js'

function dateLocale(code) {
  if (code === 'zh') return 'zh-CN'
  return code || 'en'
}

function dowMarks(locale) {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => {
    const date = new Date(2026, 8, 6 + day)
    return date.toLocaleDateString(dateLocale(locale), { weekday: 'narrow' })
  })
}

function monthDays(year, month, todayIso) {
  const start = new Date(year, month, 1)
  const pad = start.getDay()
  const last = new Date(year, month + 1, 0).getDate()
  const nights = []
  for (let i = 0; i < pad; i += 1) nights.push({ pad: true, key: `pad-${i}` })
  for (let day = 1; day <= last; day += 1) {
    const iso = isoDate(new Date(year, month, day))
    nights.push({ pad: false, key: iso, iso, dayNum: String(day), isToday: iso === todayIso })
  }
  while (nights.length % 7 !== 0) nights.push({ pad: true, key: `pad-end-${nights.length}` })
  return nights
}

export function HangMonthCal({ mode, value, onChange, now = new Date(), dayFoldHour = 0, colors }) {
  const prefs = usePrefs()
  const todayIso = boardDate(now, dayFoldHour)
  const todayDate = parseIsoDate(todayIso) || now
  const [monthShift, setMonthShift] = useState(0)

  const view = useMemo(() => {
    const start = new Date(todayDate.getFullYear(), todayDate.getMonth() + monthShift, 1)
    return {
      start,
      label: start.toLocaleDateString(dateLocale(prefs.locale), { month: 'long', year: 'numeric' }),
      nights: monthDays(start.getFullYear(), start.getMonth(), todayIso),
      lastDay: new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate(),
    }
  }, [todayDate, monthShift, todayIso, prefs.locale])

  const dows = dowMarks(prefs.locale)
  const [cell, setCell] = useState(0)

  function onGrid(event) {
    const width = event.nativeEvent.layout.width
    const next = Math.floor(width / 7)
    if (next > 0 && next !== cell) setCell(next)
  }

  const col = cell > 0 ? { width: cell, height: 18 } : { width: '14.28%' }
  const dayBox = cell > 0 ? { width: cell, height: cell } : { width: '14.28%', height: 40 }

  function isPick(night) {
    if (mode === 'monthly') {
      if (value === 'last') return Number(night.dayNum) === view.lastDay
      return Number(night.dayNum) === Number(value)
    }
    return night.iso === value
  }

  // A date to do it by or on can't be in the past.
  const gone = (night) => mode !== 'monthly' && night.iso < todayIso

  function pickDay(night) {
    if (gone(night)) return
    if (mode === 'monthly') onChange(Number(night.dayNum))
    else onChange(night.iso)
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Pressable onPress={() => setMonthShift((n) => n - 1)} hitSlop={8}>
          <Text style={[styles.shift, { color: colors.inkDim }]}>‹</Text>
        </Pressable>
        <Text style={[styles.label, { color: colors.ink }]}>{view.label}</Text>
        <Pressable onPress={() => setMonthShift((n) => n + 1)} hitSlop={8}>
          <Text style={[styles.shift, { color: colors.inkDim }]}>›</Text>
        </Pressable>
      </View>
      <View style={styles.grid} onLayout={onGrid}>
        {dows.map((day, i) => (
          <Text key={`dow-${i}`} style={[styles.dow, col, { color: colors.inkDim }]}>{day}</Text>
        ))}
        {view.nights.map((night) =>
          night.pad ? (
            <View key={night.key} style={dayBox} />
          ) : (
            <Pressable
              key={night.key}
              onPress={() => pickDay(night)}
              disabled={gone(night)}
              accessibilityState={{ disabled: gone(night), selected: isPick(night) }}
              style={[
                gone(night) && { opacity: 0.35 },
                styles.day,
                dayBox,
                {
                  borderColor: isPick(night) ? colors.onDeep : night.isToday ? colors.on : colors.line,
                  backgroundColor: isPick(night) ? colors.panel3 : colors.panel2,
                },
              ]}
            >
              <Text style={{ color: isPick(night) ? colors.on : colors.ink, fontSize: 13 }}>{night.dayNum}</Text>
            </Pressable>
          ),
        )}
      </View>
      {mode === 'monthly' ? (
        <Pressable
          onPress={() => onChange('last')}
          style={[
            styles.lastBtn,
            {
              borderColor: value === 'last' ? colors.onDeep : colors.line,
              backgroundColor: value === 'last' ? colors.panel3 : colors.panel2,
            },
          ]}
        >
          <Text style={{ color: value === 'last' ? colors.on : colors.ink }}>{t('hang.lastDay')}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginVertical: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shift: { fontSize: 20, paddingHorizontal: 8 },
  label: { fontFamily: fonts.uiSemi, fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dow: { textAlign: 'center', fontSize: 11, lineHeight: 16 },
  day: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  lastBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
})
