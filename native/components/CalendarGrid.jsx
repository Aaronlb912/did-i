import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { shortLabel } from '../../src/lib/board-json.js'
import { monthStripNights, nightDueRows, nightWhy } from '../../src/lib/hall-pages.js'
import { t } from '../../src/lib/i18n.js'
import { usePrefs } from '../../src/lib/prefs.js'
import { boardDate, formatBoardDate } from '../../src/lib/recurrence.js'
import { nightWhyLines } from '../../src/lib/night-why.js'
import { publishSheet } from './SheetHost.jsx'
import { fonts } from '../theme.js'
import { useLayoutState } from '../lib/motion.jsx'

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

// Every mark reads the same way: Did, Late, Nope, Open.
const upFirst = (text) => text.charAt(0).toLocaleUpperCase() + text.slice(1)

// No answer reads by where the night sits: still ahead, tonight, or gone.
function markOf(answer, when = 0) {
  const status = answer?.status
  if (status === 'yes') return { key: 'yes', label: t('widget.tonight.did') }
  if (status === 'late') return { key: 'late', label: upFirst(t('hole.late')) }
  if (status === 'skip') return { key: 'skip', label: t('widget.tonight.nope') }
  if (when > 0) return { key: 'hole', label: t('cal.ahead') }
  if (when < 0) return { key: 'skip', label: t('later.missed') }
  return { key: 'hole', label: upFirst(t('cal.open')) }
}

export function CalendarGrid({ book, boards = [], tagId = '', now, colors }) {
  const prefs = usePrefs()
  const clock = now || new Date()
  const [monthShift, setMonthShift] = useLayoutState(0)
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

  // A day opens its sheet: why it did or did not clear, then each question.
  function openDay(iso) {
    setPicked(iso)
    const today = boardDate(clock, book?.dayFoldHour)
    const when = iso > today ? 1 : iso < today ? -1 : 0
    const rows = nightDueRows(shelf, iso, tagId)
    const close = () => {
      setPicked('')
      publishSheet(null)
    }
    publishSheet({
      kicker: t('cal.kicker'),
      title: formatBoardDate(iso),
      body: nightWhyLines(nightWhy(shelf, iso, clock, tagId)).join('\n'),
      content: rows.length ? (
        <View style={styles.marks}>
          {rows.map((row) => {
            const mark = markOf(row.answer, when)
            return (
              <View key={`${row.boardId}-${row.lamp.id}`} style={styles.markRow}>
                <View style={[styles.markPip, { backgroundColor: colors[mark.key === 'yes' ? 'on' : mark.key === 'late' ? 'late' : mark.key === 'skip' ? 'skip' : 'open'] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.markLabel, { color: colors.ink }]}>{mark.label}</Text>
                  <Text style={[styles.markSub, { color: colors.inkDim }]}>{shortLabel(row.lamp)}</Text>
                </View>
              </View>
            )
          })}
        </View>
      ) : null,
      closeLabel: t('cal.close'),
      colors,
      onClose: close,
    })
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('cal.prev')} onPress={() => { setMonthShift((n) => n - 1); setPicked('') }} hitSlop={8}>
          <Text style={[styles.shift, { color: colors.inkDim }]}>‹</Text>
        </Pressable>
        <Text style={[styles.month, { color: colors.ink }]}>{monthLabel}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('cal.next')}
          accessibilityState={{ disabled: monthShift >= 0 }}
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
              accessibilityRole="button"
              accessibilityLabel={t('cal.day', { date: night.iso })}
              onPress={() => openDay(night.iso)}
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
              {night.empty ? (
                <View style={styles.pip} />
              ) : (
                <View
                  style={[
                    styles.pip,
                    {
                      backgroundColor: night.on ? colors.on : night.miss ? colors.miss : colors.open,
                    },
                  ]}
                />
              )}
            </Pressable>
          ),
        )}
      </View>

    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shift: { fontSize: 20, paddingHorizontal: 8 },
  month: { fontFamily: fonts.uiSemi, fontSize: 17 },
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
  marks: { marginTop: 2 },
  markRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 },
  markPip: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  markLabel: { fontFamily: fonts.uiSemi, fontSize: 14 },
  markSub: { fontFamily: fonts.ui, fontSize: 13 },
})
