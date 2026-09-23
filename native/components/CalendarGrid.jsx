import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { shortLabel } from '../../src/lib/board-json.js'
import { monthStripNights, nightDueRows } from '../../src/lib/hall-pages.js'
import { t } from '../../src/lib/i18n.js'
import { usePrefs } from '../../src/lib/prefs.js'
import { boardDate, formatBoardDate } from '../../src/lib/recurrence.js'
import { KeyButton } from './ui.jsx'
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

function markOf(answer) {
  const status = answer?.status
  if (status === 'yes') return { key: 'yes', label: t('tonight.swipeDid') }
  if (status === 'late') return { key: 'late', label: t('hole.late') }
  if (status === 'skip') return { key: 'skip', label: t('tonight.swipeNope') }
  return { key: 'hole', label: t('cal.open') }
}

export function CalendarGrid({ book, boards = [], tagId = '', now, colors }) {
  const prefs = usePrefs()
  const clock = now || new Date()
  const [monthShift, setMonthShift] = useState(0)
  const [picked, setPicked] = useState('')

  useEffect(() => {
    setMonthShift(0)
    setPicked('')
  }, [tagId])

  const shelf = boards.length ? boards : [book]
  const pack = monthStripNights(shelf, clock, tagId, monthShift)
  const locale = dateLocale(prefs.locale)
  const monthLabel = pack.start.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const dows = dowMarks(prefs.locale)
  const nightRows = picked ? nightDueRows(shelf, picked, tagId) : []
  const pickedLabel = picked ? formatBoardDate(picked) : ''

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Pressable onPress={() => { setMonthShift((n) => n - 1); setPicked('') }} hitSlop={8}>
          <Text style={[styles.shift, { color: colors.inkDim }]}>‹</Text>
        </Pressable>
        <Text style={[styles.month, { color: colors.ink }]}>{monthLabel}</Text>
        <Pressable
          disabled={monthShift >= 0}
          onPress={() => { setMonthShift((n) => Math.min(0, n + 1)); setPicked('') }}
          hitSlop={8}
        >
          <Text style={[styles.shift, { color: monthShift >= 0 ? colors.line : colors.inkDim }]}>›</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {dows.map((day, i) => (
          <Text key={`dow-${i}`} style={[styles.dow, { color: colors.inkDim }]}>{day}</Text>
        ))}
        {pack.nights.map((night) =>
          night.pad ? (
            <View key={night.iso} style={styles.pad} />
          ) : (
            <Pressable
              key={night.iso}
              onPress={() => setPicked(night.iso)}
              style={[
                styles.day,
                {
                  borderColor: picked === night.iso ? colors.onDeep : night.isToday ? colors.on : colors.line,
                  backgroundColor: picked === night.iso ? colors.panel3 : colors.panel2,
                  opacity: night.empty ? 0.45 : 1,
                },
              ]}
            >
              <Text style={{ color: night.isToday ? colors.on : colors.ink, fontSize: 13 }}>{night.dayNum}</Text>
              <View
                style={[
                  styles.pip,
                  {
                    backgroundColor: night.on ? colors.on : night.miss ? colors.miss : colors.open,
                  },
                ]}
              />
            </Pressable>
          ),
        )}
      </View>

      {picked ? (
      <Modal visible transparent animationType="fade" onRequestClose={() => setPicked('')}>
        <Pressable style={styles.veil} onPress={() => setPicked('')}>
          <Pressable style={[styles.pop, { backgroundColor: colors.panel, borderColor: colors.line }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.popKicker, { color: colors.on }]}>{t('cal.kicker')}</Text>
            <Text style={[styles.popTitle, { color: colors.ink }]}>{pickedLabel}</Text>
            <ScrollView style={{ maxHeight: 240 }}>
              {nightRows.length ? (
                nightRows.map((row) => {
                  const mark = markOf(row.answer)
                  return (
                    <View key={`${row.boardId}-${row.lamp.id}`} style={styles.markRow}>
                      <View style={[styles.markPip, { backgroundColor: colors[mark.key === 'yes' ? 'on' : mark.key === 'late' ? 'late' : mark.key === 'skip' ? 'skip' : 'open'] }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.markLabel, { color: colors.ink }]}>{mark.label}</Text>
                        <Text style={[styles.markSub, { color: colors.inkDim }]}>{shortLabel(row.lamp)}</Text>
                      </View>
                    </View>
                  )
                })
              ) : (
                <Text style={{ color: colors.inkSoft }}>{t('cal.empty')}</Text>
              )}
            </ScrollView>
            <KeyButton label={t('cal.close')} colors={colors} onPress={() => setPicked('')} />
          </Pressable>
        </Pressable>
      </Modal>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shift: { fontSize: 20, paddingHorizontal: 8 },
  month: { fontFamily: fonts.ui, fontSize: 17, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dow: { width: '14.28%', textAlign: 'center', fontSize: 11, marginBottom: 4 },
  pad: { width: '14.28%', aspectRatio: 1 },
  day: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 4,
    gap: 2,
  },
  pip: { width: 6, height: 6, borderRadius: 3 },
  veil: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
  pop: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 10 },
  popKicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  popTitle: { fontFamily: fonts.display, fontSize: 22, fontWeight: '700' },
  markRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 },
  markPip: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  markLabel: { fontFamily: fonts.ui, fontSize: 14, fontWeight: '600' },
  markSub: { fontFamily: fonts.ui, fontSize: 13 },
})
